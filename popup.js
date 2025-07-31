document.getElementById('extract').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const productUrl = tab.url;

  const response = await fetch('http://localhost:5000/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: productUrl })
  });

  const data = await response.json();
  document.getElementById('result').textContent = JSON.stringify(data, null, 2);
});
