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

//**START DOM CONNECTORS **//
Object.assign(state, domConnectors());
function domConnectors() {

  // *All* other DOM links are based on testResultsHeader.
  let testResultsHeader = Array.prototype.slice.call(
    document.querySelectorAll('thead > tr > th > div.tablesorter-header-inner'))
    .filter((el) => (el.innerText.indexOf('Test Result') === 0))  //The first p should contain "Test Result".
    [0].parentNode;                                               //Take the parent th.

  //parentTable
  let parentTable = getClosest('table', testResultsHeader);       //Based on testResultsHeader
  //statsRow
  let statsRow = parentTable.insertRow(1);                        //Based on parentTable

  let jIRASpans = parentTable.querySelectorAll('.confluence-jim-macro.jira-issue');

  //jIRAInfos
  let jIRAInfos = [];
  for(i =0; jIRASpans.length > i; i++) {
    let td = getClosest('td', jIRASpans[i]);
    let yIndex = Array.prototype.slice.call(td.parentNode.childNodes).indexOf(td);
    jIRAInfo = {
      'td': td,
      'yIndex': yIndex
    };
    jIRAInfo.status = getJIRAStatusFromTd.bind(jIRAInfo);
    jIRAInfos.push(jIRAInfo);
  }

  let thElsInFirstThead = Array.prototype.slice.call(
    getClosest('tr', testResultsHeader).childNodes)
    .filter((thEl) => (thEl.nodeName == "TH"));
  //headerInfos
  let headerInfos = thElsInFirstThead.map((td, index) =>
    createHeaderInfo(td, index, jIRAInfos, parentTable, statsRow, testResultsHeader));

  return {headerInfos};

  //utility functions...
  function getJIRAStatusFromTd(td) {
    if(td === undefined) td = this.td;
    let status = td.querySelector('span.aui-lozenge').innerText;
    return status;
  }

  function createHeaderInfo(td, index, jIRAInfos, parentTable, statsRow, testResultsHeader) {
    let label = null;
    let tdEls = getTdsForHeaderIndex(index, parentTable) || [];
    let tdElsForResult = {};
    let jIRAInfosHere = jIRAInfos.filter((info) => info.yIndex == index);
    let jIRAInfosForStatus = {};

    if(index === 0) {
      label = 'leftAxis';
    } else if(index == 1) {
      label = 'testCaseId';
    } else if(td == testResultsHeader) {
      label = 'testResult';

      state.countableTestResults.forEach((result) => {
        let filtered = tdEls.filter((tdEl) => tdEl.innerText.indexOf(result) === 0);
        tdElsForResult[result] = filtered;
      });

    } else if(jIRAInfosHere.length > 0) {
      label = 'JIRA';
      //see refreshJIRAHeader for data population
    }

    return {
      'label': label,
      'index': index,
      // 'headerEl': td,
      'statsEl': statsEl = statsRow.insertCell(),
      'tdEls': tdEls,
      'tdElsForResult': tdElsForResult,
      'jIRAInfos': jIRAInfosHere,
      'jIRAInfosForStatus': jIRAInfosForStatus
    };
  }//createHeaderInfo


  function getClosest(selector, element) {
    let res = element;
    while (res && !res.matches(selector)) {
      res = res.parentNode;
    }
    return res;
  }

  /**
   * headerIndex may be from 0 up to the nth row of the first table.
   * Returns td elements for the index.
   */
  function getTdsForHeaderIndex(headerIndex, parentTable) {
    //Assumes there is only one tbody
    let tds = parentTable.querySelectorAll(
      'tbody > tr > td:nth-child(' + (headerIndex+1) + ')');
    return (Array.prototype.slice.call(tds) || []);
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
  switch(headerInfo.label) {
    case "leftAxis":
      headerInfo.statsEl.innerText = 'Stats';
      break;
    case "testResult":
      state.countableTestResults.forEach((result) => {
        let stat = result + ': ' + headerInfo.tdElsForResult[result].length + '<br>';
        headerInfo.statsEl.innerHTML += stat;
      });
      break;
    case "JIRA":
      startWatchingJIRADOM(headerInfo);
      refreshJIRAHeader(headerInfo);
      break;
  }
}//updateStatsUi

//**START JIRA change events **//
function refreshJIRAHeader(headerInfo) {
  //update latest value for jIRAInfosForStatus
  headerInfo.jIRAInfosForStatus = groupJIRALinks(headerInfo.jIRAInfos);

  headerInfo.statsEl.innerHTML = '';
  state.countableJIRAStatuses.forEach((status) => {
                          // headerInfo.jIRAInfos.forEach((jIRAInfo) => {

    let count = headerInfo.jIRAInfosForStatus[status].length;
    headerInfo.statsEl.innerHTML += status + ': ' + count + '<br>';

    if(status == 'STATUS' && count > 0) {
    //sanity check
    //   headerInfo.statsEl.innerHTML += '***"STATUS" meaning failed RACE CONDITION***';
    }
  });
}


function startWatchingJIRADOM(headerInfo) {
  // var target = document.querySelector('table.confluenceTable .confluence-jim-macro.jira-issue').parentNode;
  let selJIRASpans = 'table.confluenceTable td:nth-child(' + (headerInfo.index + 1) + ') span.confluence-jim-macro.jira-issue';
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
  }
  return true;
}

//TODO modularize me
}
