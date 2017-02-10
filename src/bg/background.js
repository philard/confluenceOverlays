// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });


//example of using a message handler from the inject scripts
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    //backup injection
    // chrome.tabs.insertCSS(sender.tab.id, {code: "body{border:1px solid red}"});
    // chrome.tabs.insertCSS(sender.tab.id, {file:"src/inject/inject.css"});

  	chrome.pageAction.show(sender.tab.id);
    sendResponse();
  });
