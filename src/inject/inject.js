chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);
    console.log("Hello. This message was sent from scripts/inject.js");


    //**START DOM CONNECTORS **//

    function getClosest(selector, element) {
      let res = element;
      while (res && !res.matches(selector)) {
        res = res.parentNode;
      }
      return res;
    }

    function getTdsForHeaderIndex(header, selector) {
      //TODO add extra filtering using selector
      let headerIndex = (header.index || header);
      let tds = parentTable.querySelectorAll('tbody > tr > td:nth-child(' + (headerIndex+1) + ')');
      return (Array.prototype.slice.call(tds) || []);
    }

    let countableTexts = ['Passed', 'Failed', 'Skipped', 'Blocked'];
    let countableJIRAStatuses = ['On Hold', 'QA TEST', 'CLOSED', 'DELIVERED', 'STATUS'];


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
        // TODO 'key': jIRASpans[0].attributes['href'].value,
        'status': jIRASpans[i].innerText,
        'yIndex': yIndex
      };
      jIRAInfos.push(jIRAInfo);
    }

    //headerInfos
    let headerInfos = Array.prototype.slice.call(getClosest('tr', testResultsHeader).childNodes);
    headerInfos = headerInfos.filter((el) => (el.nodeName == "TH"));
    headerInfos = headerInfos.map((td, index) => {
      let label = null;

      //jIRAInfosForHeaderInfo
      let jIRAInfosForHeaderInfo = jIRAInfos.filter((info) => info.yIndex == index);

      //jIRAInfosForHeaderInfoForText
      let jIRAInfosForHeaderInfoForText = {};


      //tdEls
      let tdEls = getTdsForHeaderIndex(index) || [];

      //tdElsForText
      let tdElsForText = {};

      //label
      if(index === 0) {
        label = 'leftAxis';
      } else if(td == testResultsHeader) {
        label = 'testResult';

        countableTexts.forEach((text) => {
          let filtered = tdEls.filter((tdEl) => tdEl.innerText.indexOf(text) === 0);
          tdElsForText[text] = filtered;
        });

      } else if(jIRAInfosForHeaderInfo.length > 0) {
        label = 'JIRA';

        countableJIRAStatuses.forEach((status) => {
          let forStatus = jIRAInfosForHeaderInfo.filter((jIRAInfo) => {
            return jIRAInfo.status == status;
          });
          jIRAInfosForHeaderInfoForText[status] = forStatus;
        });
      }

      return {
        'label': label,
        'index': index,
        'headerEl': td,
        'statsEl': statsEl = statsRow.insertCell(),
        'tdEls': tdEls,
        'tdElsForText': tdElsForText,
        'jIRAInfos': jIRAInfosForHeaderInfo,
        'jIRAInfosForText': jIRAInfosForHeaderInfoForText
      };
    });//headerInfos



//**START PAGE LOAD STATS **//

    //updateStatsUi
    headerInfos.forEach(updateStatsUi);
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
    }


    //TODO modularize me


    console.log("scripts/inject.js completed");
	}
	}, 10);
});
