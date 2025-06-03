chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.action === 'fetchVideoData') {
      fetch(request.url)
        .then(r => r.json())
        .then(d => {
          console.log("后台拿到数据:", d);
          sendResponse({ data: d });
        })
        .catch(e => {
          console.error("后台请求失败:", e);
          sendResponse({ error: e.toString() });
        });
      return true;
    }
  });
  