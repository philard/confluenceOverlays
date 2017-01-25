chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
	if (document.readyState === "complete") {
		clearInterval(readyStateCheckInterval);

		// ----------------------------------------------------------
		// This part of the script triggers when page is done loading
		console.log("Hello. This message was sent from scripts/inject.js");
		// ----------------------------------------------------------


		let testres = Array.prototype.filter.call(document.querySelectorAll(
		'thead div.tablesorter-header-inner'), 
		(el) => el.innerText == "Test Result")[0];

		let parentTable = testres;
		while (parentTable && !parentTable.matches('table')) {
			parentTable = parentTable.parentNode;
		}
		
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
		
		Array.prototype.forEach.call(blocked,
			(el) => el.style['background-color'] = 'red' );

        console.log("scripts/inject.js completed");
	}
	}, 10);
});
