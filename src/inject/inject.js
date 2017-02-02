chrome.extension.sendMessage({}, function(response) {
  var readyStateCheckInterval = setInterval(function() {
  if (document.readyState !== "complete") return;
    clearInterval(readyStateCheckInterval);
    console.log("Hello. This message was sent from scripts/inject.js");
    inject();
    console.log("scripts/inject.js completed");
  }, 10);
});
function inject() {
//**START CONFIGURABLE CONSTANTS**//
let state = {
  'countableTexts': ['Passed', 'Failed', 'Skipped', 'Blocked'],
  'countableJIRAStatuses': ['On Hold', 'QA TEST', 'CLOSED', 'DELIVERED', 'STATUS']
};

//**START DOM CONNECTORS **//
Object.assign(state, domConnectors());
function domConnectors() {

  // *All* other DOM links are based on testResultsHeader.
  let testResultsHeader = Array.prototype.slice.call(
    document.querySelectorAll('thead > tr > th > div.tablesorter-header-inner'))
    .filter((el) => (el.innerText.indexOf('Test Result') === 0))  //The first p should say Test Results.
    [0].parentNode;                                               //Take the parent th.

  let parentTable = getClosest('table', testResultsHeader);       //Based on testResultsHeader
  let statsRow = parentTable.insertRow(1);                        //Based on parentTable

  let jIRASpans = parentTable.querySelectorAll('span.aui-lozenge');
  let jIRAInfos = [];
  for(i =0; jIRASpans.length > i; i++) {
    let td = getClosest('td', jIRASpans[i]);
    let yIndex = Array.prototype.slice.call(td.parentNode.childNodes).indexOf(td);
    jIRAInfo = {
      'status': jIRASpans[i].innerText,
      'yIndex': yIndex
    };
    jIRAInfos.push(jIRAInfo);
  }

  //headerInfos
  let thElsInFirstThead = Array.prototype.slice.call(
    getClosest('tr', testResultsHeader).childNodes)
    .filter((thEl) => (thEl.nodeName == "TH"));
  let headerInfos = thElsInFirstThead.map((td, index) =>
    createHeaderInfo(td, index, jIRAInfos, parentTable, statsRow, testResultsHeader));



  return {headerInfos};


  function createHeaderInfo(td, index, jIRAInfos, parentTable, statsRow, testResultsHeader) {
    let label = null;
    let jIRAInfosHere = jIRAInfos.filter((info) => info.yIndex == index);
    let jIRAInfosForText = {};
    let tdEls = getTdsForHeaderIndex(index, parentTable) || [];
    let tdElsForText = {};

    if(index === 0) {
      label = 'leftAxis';
    } else if(td == testResultsHeader) {
      label = 'testResult';

      countableTexts.forEach((text) => {
        let filtered = tdEls.filter((tdEl) => tdEl.innerText.indexOf(text) === 0);
        tdElsForText[text] = filtered;
      });

    } else if(jIRAInfosHere.length > 0) {
      label = 'JIRA';

      countableJIRAStatuses.forEach((status) => {
        let forStatus = jIRAInfosHere.filter((jIRAInfo) => {
          return jIRAInfo.status == status;
        });
        jIRAInfosForText[status] = forStatus;
      });
    }

    return {
      'label': label,
      'index': index,
      // 'headerEl': td,
      'statsEl': statsEl = statsRow.insertCell(),
      'tdEls': tdEls,
      'tdElsForText': tdElsForText,
      'jIRAInfos': jIRAInfosHere,
      'jIRAInfosForText': jIRAInfosForText
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



//**START PAGE LOAD STATS **//

//updateStatsUi
state.headerInfos.forEach(updateStatsUi);
function updateStatsUi(headerInfo) {
  switch(headerInfo.label) {
    case "leftAxis":
      headerInfo.statsEl.innerText = 'Stats';
      break;
    case "testResult":
      countableTexts.forEach((text) => {
        let stat = text + ': ' + headerInfo.tdElsForText[text].length + '<br>';
        headerInfo.statsEl.innerHTML += stat;
      });
      break;
    case "JIRA":

      headerInfo.statsEl.innerHTML = '_JIRA statuses_<br>';
      Object.keys(headerInfo.jIRAInfosForText).forEach((status) => {

        let count = headerInfo.jIRAInfosForText[status].length;
        headerInfo.statsEl.innerHTML += status + ': ' + count + '<br>';
        if(status == 'STATUS') {
          headerInfo.statsEl.innerHTML += '***TODO FIX RACE CONDITION***';
        }
      });
      break;
  }
}//updateStatsUi

function reactToJIRAStatusChange(headerInfo, status) {
  let count = headerInfo.jIRAInfosForText[status].length;
  headerInfo.statsEl.innerHTML += status + ': ' + count + '<br>';
  if(status == 'STATUS') {
    headerInfo.statsEl.innerHTML += '***TODO FIX RACE CONDITION***';
  }
}



//**START JIRA change events **//
var target = document.querySelector('.confluence-jim-macro.jira-issue');

// create an observer instance
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
  console.log(mutation.type);
  });
});
// configuration of the observer:
var config = { attributes: true, childList: true, characterData: true };

// pass in the target node, as well as the observer options
observer.observe(target, config);


//TODO modularize me
}
