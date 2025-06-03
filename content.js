(() => {
  let stopFlag = false;

  const startCrawling = async (options) => {
    const { selectedFields, maxCount, format } = options;
    const videoIdAuthorMap = new Map();
    let lastHeight = 0;
    let retries = 0;

    const progressBox = document.createElement('div');
    Object.assign(progressBox.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#ffffff', // ✅ 白色底色
      color: '#202124', // Google 风格文字颜色
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)', // Google 风格阴影
      borderRadius: '8px',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
      fontFamily: '"Roboto", "Arial", sans-serif', // Google 常用字体
      zIndex: 9999,
      minWidth: '180px',
      textAlign: 'center',
      lineHeight: '1.4'
    });
    progressBox.textContent = '开始采集...';
    document.body.appendChild(progressBox);

    const stopBtn = document.createElement('button');
    stopBtn.textContent = '停止采集';
    Object.assign(stopBtn.style, {
      position: 'fixed',
      top: '70px',
      right: '20px',
      background: '#d93025', // Google 红色按钮
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      padding: '8px 16px',
      fontSize: '14px',
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(60,64,67,.3)',
      transition: 'background 0.3s ease',
      fontFamily: '"Roboto", "Arial", sans-serif'
    });
    stopBtn.onclick = () => {
      stopFlag = true;
      progressBox.textContent = '已点击停止，准备导出数据...';
      stopBtn.style.display = 'none';  // ✅ 停止采集后隐藏按钮
    };
    stopBtn.onmouseenter = () => stopBtn.style.background = '#c5221f';
    stopBtn.onmouseleave = () => stopBtn.style.background = '#d93025';
    document.body.appendChild(stopBtn);

    const scrollAndCollect = async () => {
      if (stopFlag) return;

      document.querySelectorAll("a[href*='/video/']").forEach(a => {
        const match = a.href.match(/\/@([^/]+)\/video\/(\d+)/);
        if (match) {
          const userName = match[1];
          const videoId = match[2];
          videoIdAuthorMap.set(videoId, userName);
        }
      });

      progressBox.textContent = `已采集 ${videoIdAuthorMap.size} 条视频ID...`;
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 1500));

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight) {
        retries++;
        if (retries > 10) return;
      } else {
        retries = 0;
        lastHeight = newHeight;
      }
      await scrollAndCollect();
    };

    await scrollAndCollect();

    progressBox.textContent = `开始获取视频详情，共 ${videoIdAuthorMap.size} 条...`;

    const formatTimestamp = (ts) => {
      if (!ts) return '';
      const date = new Date(ts * 1000);
      return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0];
    };

    const fetchVideoData = (userName, videoId) => {
      const url = `https://douyin.wtf/api/hybrid/video_data?url=https://www.tiktok.com/@${userName}/video/${videoId}&minimal=false`;
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'fetchVideoData', url }, (response) => {
          if (response) resolve(response);
          else reject(response?.error || "无数据");
        });
      });
    };

    const videoDetails = [];
    let i = 0;

    for (let [id, userName] of videoIdAuthorMap.entries()) {
      i++;
      progressBox.textContent = `正在获取第 ${i} / ${videoIdAuthorMap.size} 条...`;
      try {
        const d = await fetchVideoData(userName, id);
        if (d && d.data && d.data.data) {
          const detail = d.data.data;

          // 1️⃣ 全部字段数据
          const row = {
            video_id: id,
            userName,
            title: detail.desc || "Untitled",
            video_duration: ((detail.video?.duration || 0) / 1000).toFixed(2) + ' s',
            comment_count: detail.statistics?.comment_count || 0,
            digg_count: detail.statistics?.digg_count || 0,
            play_count: detail.statistics?.play_count || 0,
            share_count: detail.statistics?.share_count || 0,
            collect_count: detail.statistics?.collect_count || 0,
            createTime: formatTimestamp(detail.create_time),
            video_url: detail.video?.wm_video_url || detail.video?.play_addr?.url_list?.[0] || "No URL"
          };

          // 2️⃣ 按用户勾选字段过滤（核心改动）
          const filteredRow = {};
          selectedFields.forEach(field => filteredRow[field] = row[field] ?? '');
          videoDetails.push(filteredRow);

          // ✅ 你之前是直接 push(row)，现在换成 push(filteredRow)
        }
      } catch (e) {
        console.warn(`Video ID ${id} 获取失败:`, e);
      }
      await new Promise(r => setTimeout(r, 500));
    }


    progressBox.textContent = '正在生成 CSV 文件...';

    const exportToCSV = (data) => {
      if (!data.length) {
        console.warn("⚠️ 没有可导出的数据！");
        return;
      }
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "tiktok_video_details.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    exportToCSV(videoDetails);
    progressBox.textContent = '采集完成，CSV 已生成！';
    stopBtn.remove();
  };

  // 监听 popup 的“开始采集”消息
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "startCrawling") {
      startCrawling(request.options);
    }
  });
})();
