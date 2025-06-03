document.getElementById('startCollect').addEventListener('click', () => {
  // 收集用户勾选的字段
  const selectedFields = [];
  document.querySelectorAll('#fieldsContainer input[name="field"]:checked').forEach(checkbox => {
    selectedFields.push(checkbox.value);
  });

  // 其他参数（可选）
  const maxCount = 0; // 或者用户可输入
  const format = 'csv'; // 这里可根据用户选项调整

  // 发送消息到 content.js
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "startCrawling",
      options: {
        selectedFields,
        maxCount,
        format
      }
    });
  });
});
