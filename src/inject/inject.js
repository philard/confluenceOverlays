chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);

    function getClosest(selector, element) {
      let res = element;
      while (res && !res.matches(selector)) {
        res = res.parentNode;
      }
      return res;
    }

		// ----------------------------------------------------------
		// This part of the script triggers when page is done loading
		console.log("Hello. This message was sent from scripts/inject.js");
		// ----------------------------------------------------------



		let testResultsHeader = Array.prototype.filter.call(document.querySelectorAll(
  		'thead div.tablesorter-header-inner'),
  		(el) => el.innerText == "Test Result")[0];

    let headers = Array.prototype.slice.call(
      getClosest('tr', testResultsHeader).childNodes);

    let parentTable = getClosest('table', testResultsHeader);

    let jIRALinks = parentTable.querySelectorAll('a.jira-issue-key');
    let jIRAInfos = [];
    for(i =0; jIRALinks.length > i; i++) {
      let td = getClosest('td', jIRALinks[0]);
      let trIndex = Array.prototype.indexOf.call(td.parentNode.childNodes, td);
      jIRAInfo = {
        'key': jIRALinks[0].attributes['href'].value,
        'status': jIRALinks[0].innerText,
        'trIndex': trIndex,
        'headerEl': headers[trIndex]
      };
      jIRAInfos.push(jIRAInfo);
    }

    let columnsWithJiraInfo = headers.map((header, index) => {
      return {
        'index': index,
        'headerEl': header,
        'jIRAInfos': jIRAInfos.filter((info) => info.trIndex == index)
      }
    });

    columnsWithJiraInfo =
      columnsWithJiraInfo.filter((column) => column.jIRAInfos.length > 0);



		var row = parentTable.insertRow(1);
		var cell1 = row.insertCell(0);
		row.insertCell();
		row.insertCell();
		row.insertCell();
		var cell4 = row.insertCell();
		cell1.innerHTML = "Stats";
		cell4.innerHTML = "";


		let passed = Array.prototype.filter.call(document.querySelectorAll(
			'td.confluenceTd'),
			(el) => (el.innerText.startsWith('Passed')));
		cell4.innerHTML = cell4.innerHTML + 'Passed:' + passed.length;

		let failed = Array.prototype.filter.call(document.querySelectorAll(
			'td.confluenceTd'),
			(el) => (el.innerText.startsWith('Failed')));
		cell4.innerHTML = cell4.innerHTML + '<br>Failed: '+ failed.length;

		let skipped = Array.prototype.filter.call(document.querySelectorAll(
			'td.confluenceTd'),
			(el) => (el.innerText.startsWith('Skipped')));
		cell4.innerHTML = cell4.innerHTML + '<br>Skipped: '+ skipped.length;

		let blocked = Array.prototype.filter.call(document.querySelectorAll(
			'td.confluenceTd'),
			(el) => (el.innerText.startsWith('Blocked')));
		cell4.innerHTML = cell4.innerHTML + '<br>Blocked: '+ blocked.length;


    //TODO modularize me

    columnsWithJiraInfo.forEach((info) => {
      var cell = row.insertCell();
      cell.innerHTML = 'JIRA links found:' + info.jIRAInfos.length;
    });


    console.log("scripts/inject.js completed");
	}
	}, 10);
});
