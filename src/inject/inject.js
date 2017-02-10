chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
    if (document.readyState !== 'interactive' &&
        document.readyState !== 'loading') return; //loading -> interactive -> complete
    clearInterval(readyStateCheckInterval);
    console.log("Hello. This message was sent from scripts/inject.js");
    inject();
    console.log("scripts/inject.js completed");
  }, 10);
});



function inject() {
//**START CONFIGURABLE CONSTANTS**//
let state = {
  'countableTestResults': ['Passed', 'Failed', 'Skipped', 'Blocked', 'OutScope'],
  'countableJIRAStatuses': ['ON HOLD', 'QA TEST', 'CLOSED', 'DELIVERED', 'STATUS']
};
state.jIRAOnHold = state.countableJIRAStatuses[0].toUpperCase();

//**START DOM CONNECTORS **//
Object.assign(state, domConnectors());
function domConnectors() {

  // *All* other DOM links are based on testResultsHeader.
  let testResultsHeader = Array.prototype.slice.call(
    document.querySelectorAll('thead > tr > th > div.tablesorter-header-inner'))
    .filter((el) => (el.innerText.indexOf('Test Result') === 0))  //The first p should contain "Test Result".
    [0].parentNode;                                               //Take the parent th.
  let xIndexOfTestResults = Array.prototype.slice.call(testResultsHeader.parentNode.childNodes).indexOf(testResultsHeader);
  //parentTable
  let parentTable = getClosest('table', testResultsHeader);       //Based on testResultsHeader
  //statsRow
  let statsRow = parentTable.insertRow(1);                        //Based on parentTable

  let jIRASpans = parentTable.querySelectorAll('.confluence-jim-macro.jira-issue');

  //jIRAInfos
  let jIRAInfos = [];
  for(i =0; jIRASpans.length > i; i++) {
    let td = getClosest('td', jIRASpans[i]);
    let xIndexOfJIRA = Array.prototype.slice.call(td.parentNode.childNodes).indexOf(td);
    jIRAInfo = {
      'td': td,
      'xIndex': xIndexOfJIRA,
      'resultEl': td.parentNode.childNodes[xIndexOfTestResults],
      'testCaseIdEl': td.parentNode.childNodes[1]
    };
    jIRAInfo.status = getJIRAStatusFromTd.bind(jIRAInfo);
    jIRAInfos.push(jIRAInfo);
  }

  /**
   * headerIndex may be from 0 up to the nth row of the first table.
   * Returns td elements for the index.
   */
  function getTdsForHeaderIndex(headerXIndex, parentTable) {
    //Assumes there is only one tbody
    if(parentTable === undefined) parentTable = document.querySelector('.confluenceTable'); //umprove the model to refuce britle code.
    let tds = parentTable.querySelectorAll(
      'tbody > tr > td:nth-child(' + (headerXIndex+1) + ')');
    return (Array.prototype.slice.call(tds) || []);
  }


  let thElsInThead = Array.prototype.slice.call(
    getClosest('tr', testResultsHeader).childNodes)
    .filter((thEl) => (thEl.nodeName == "TH"));

  //utility functions...
  function getJIRAStatusFromTd(td) {
    if(td === undefined) td = this.td;
    let status = td.querySelector('span.aui-lozenge').innerText;
    return status;
  }

  //headerInfos
  let headerInfos = thElsInThead.map((th, xIndex) =>
    createHeaderInfo(th, xIndex, jIRAInfos, parentTable, statsRow, testResultsHeader));
  return {headerInfos};


  function createHeaderInfo(th, xIndex, jIRAInfos, parentTable, statsRow, testResultsHeader) {
    let label = null;
    let resultEls = getTdsForHeaderIndex(xIndex, parentTable) || [];
    let resultElsForResult = {};
    let jIRAInfosHere = jIRAInfos.filter((info) => info.xIndex == xIndex);
    let jIRAInfosForStatus = {};

    if(xIndex === 0) {
      label = 'leftAxis';
    } else if(xIndex == 1) {
      label = 'testCaseId';
    } else if(th == testResultsHeader) {
      label = 'testResult';

      state.countableTestResults.forEach((result) => {
        let filtered = resultEls.filter((resultEl) => resultEl.innerText.indexOf(result) === 0);
        resultElsForResult[result] = filtered;
      });

    } else if(jIRAInfosHere.length > 0) {
      label = 'JIRA';
      //see refreshJIRAHeader for data population
    }

    let headerInfo = {
      'label': label,
      'xIndex': xIndex,
      // 'headerEl': th,
      'statsEl': statsEl = statsRow.insertCell(),
      'resultEls': resultEls,
      'resultElsForResult': resultElsForResult,
      'jIRAInfos': jIRAInfosHere,
      'jIRAInfosForStatus': jIRAInfosForStatus
    };
    return headerInfo;
  }//createHeaderInfo


  function getClosest(selector, element) {
    let res = element;
    while (res && !res.matches(selector)) {
      res = res.parentNode;
    }
    return res;
  }


}//domConnectors

//**COMMON**//
function groupJIRALinks(jIRAInfosHere) {
  let jIRAInfosForStatus = {};
  state.countableJIRAStatuses.forEach((status) => {
    let forStatus = jIRAInfosHere.filter((jIRAInfo) => {
      let infoStatus = jIRAInfo.status();
      return infoStatus.toUpperCase() == status.toUpperCase();
    });
    jIRAInfosForStatus[status] = forStatus;
  });
  return jIRAInfosForStatus;
}


//**START PAGE LOAD STATS **//

//updateStatsUi
state.headerInfos.forEach(updateStatsUi);

function updateStatsUi(headerInfo) {

  startWatchingJIRADOM(headerInfo);
  switch(headerInfo.label) {
    case 'leftAxis':
      headerInfo.statsEl.innerText = 'Stats';
      break;
    case 'testResult':
      state.countableTestResults.forEach((result) => {
        let stat = result + ': ' + headerInfo.resultElsForResult[result].length + '<br>';
        headerInfo.statsEl.innerHTML += stat;
      });
      break;
    case 'JIRA':
      refreshJIRAHeader(headerInfo);
      break;
    case 'testCaseId':
      refreshTestCaseIdHeader();
      break;
  }
}//updateStatsUi


//**START JIRA change events **//

function refreshTestCaseIdHeader() {
  try {
    let toBeRun = 0; // QA enginer must get this issue tested ASAP
    let onHold = 0; // Failed/Blocked (On Hold)

    let testCaseIdHeaderInfos = state.headerInfos[1];
    let testResultHeaderInfos = state.headerInfos[2];
    let jIRAHeaderInfos = state.headerInfos[3];

    let jIRAInfosFailedBlockedTestResult = jIRAHeaderInfos.jIRAInfos.filter((jIRAInfo) => {
      resText = jIRAInfo.resultEl.innerText;
      return (resText.indexOf('Failed') === 0 || resText.indexOf('Blocked') === 0);
    });

    let jIRAInfosToBeRun = jIRAInfosFailedBlockedTestResult.filter((jIRAInfo) => {
      return jIRAInfo.status().toUpperCase() !== state.jIRAOnHold;
    });

    let jIRAInfosOnHold = jIRAInfosFailedBlockedTestResult.filter((jIRAInfo) => {
      return jIRAInfo.status().toUpperCase() === state.jIRAOnHold;
    });

    toBeRun = jIRAInfosToBeRun.length;
    onHold = jIRAInfosOnHold.length;

    testCaseIdHeaderInfos.statsEl.innerHTML = 'toBeRun: ' + toBeRun + ' onHold: ' + onHold;
   } catch (e) {
     console.log('TODO: build a proper way to lable headers');
   } 
}

function refreshJIRAHeader(headerInfo) {
  //update latest value for jIRAInfosForStatus
  headerInfo.jIRAInfosForStatus = groupJIRALinks(headerInfo.jIRAInfos);

  headerInfo.statsEl.innerHTML = '';
  state.countableJIRAStatuses.forEach((status) => {
                          // headerInfo.jIRAInfos.forEach((jIRAInfo) => {

    let count = headerInfo.jIRAInfosForStatus[status].length;
    headerInfo.statsEl.innerHTML += status + ': ' + count + '<br>';
  });
}


function startWatchingJIRADOM(headerInfo) {
  // var target = document.querySelector('table.confluenceTable .confluence-jim-macro.jira-issue').parentNode;
  let selJIRASpans = 'table.confluenceTable td:nth-child(' + (headerInfo.xIndex + 1) + ') span.confluence-jim-macro.jira-issue';
  let targets = document.querySelectorAll(selJIRASpans);

  for(var i = 0; i < targets.length; i++) {
    let target = targets[i].parentNode;
    // create an observer instance
    var observer = new MutationObserver(reactToJIRAStatusChange);
    // configuration of the observer:
    var config = { attributes: true, childList: true, characterData: true };
    // pass in the target node, as well as the observer options
    observer.observe(target, config);
  }

  function reactToJIRAStatusChange(mutations) {
    mutations.forEach(function(mutation) { console.log('mutation.type' + mutation.type); });

    // let headerInfo = state.headerInfos[4];
    if(headerInfo) refreshJIRAHeader(headerInfo);
    refreshTestCaseIdHeader();
  }
  return true;
}

//TODO modularize me
}
