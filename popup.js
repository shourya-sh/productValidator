document.getElementById('extract').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Inject content script to scrape the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: scrapeProductData
    });
    
    const scrapedData = results[0].result;
    
    // Display results in a formatted way
    document.getElementById("result").innerHTML = `
      <strong>Title:</strong> ${scrapedData.title}<br>
      <strong>Image:</strong><br>
      <img src="${scrapedData.imageUrl}" style="max-width: 100%; height: auto;"><br>
      <strong>Description:</strong> ${scrapedData.description}<br>
      <strong>Reviews:</strong> ${scrapedData.reviews.length} found
    `;
    
    // Store the scraped data locally
    await storeScrapedData(scrapedData);
    
    // Send to backend if available
    try {
      const res = await fetch("http://localhost:5000/receive-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scrapedData),
        mode: "cors"
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Response from backend:", data);
    } catch (backendError) {
      console.log("Backend not available, data stored locally only");
    }

  } catch (error) {
    console.error("Error:", error);
    document.getElementById("result").innerText = "Error: " + error.message;
  }
});

// Function that runs in the page context to scrape data
function scrapeProductData() {
  const data = {
    title: '',
    imageUrl: '',
    description: '',
    reviews: [],
    timestamp: new Date().toISOString()
  };
  
  // Extract product title
  const titleSelectors = [
    '#productTitle',
    'h1.a-size-large',
    '.product-title',
    '[data-automation-id="product-title"]',
    'h1[data-automation-id="product-title"]'
  ];
  
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      data.title = element.textContent.trim();
      break;
    }
  }
  
  // Extract first product image
  const imageSelectors = [
    '#landingImage',
    '#imgBlkFront',
    '.a-dynamic-image',
    '.product-image img',
    '[data-old-hires]',
    '.a-dynamic-image[data-old-hires]'
  ];
  
  for (const selector of imageSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      data.imageUrl = element.src || element.getAttribute('data-old-hires');
      break;
    }
  }
  
  // Extract product description
  const descSelectors = [
    '#productDescription p',
    '#feature-bullets .a-list-item',
    '.product-description',
    '[data-automation-id="product-description"]',
    '#feature-bullets ul li'
  ];
  
  for (const selector of descSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      data.description = Array.from(elements)
        .map(el => el.textContent.trim())
        .filter(text => text.length > 0)
        .join(' ');
      break;
    }
  }
  
  // Extract all reviews
  const reviewSelectors = [
    '[data-hook="review"]',
    '.review',
    '.a-section.review',
    '[data-hook="review"] .review-text',
    '.review-content'
  ];
  
  for (const selector of reviewSelectors) {
    const reviews = document.querySelectorAll(selector);
    if (reviews.length > 0) {
      data.reviews = Array.from(reviews).map(review => {
        const ratingElement = review.querySelector('.a-icon-alt, .review-rating, .a-icon-star');
        const textElement = review.querySelector('.review-text, .review-content, [data-hook="review-body"]');
        
        return {
          rating: ratingElement ? ratingElement.textContent.trim() : '',
          text: textElement ? textElement.textContent.trim() : ''
        };
      }).filter(review => review.text.length > 0);
      break;
    }
  }
  
  return data;
}

// Function to store scraped data
async function storeScrapedData(data) {
  try {
    // Store in Chrome storage (persistent)
    await chrome.storage.local.set({ 
      'lastScrapedData': data,
      'scrapedDataHistory': await getScrapedDataHistory().then(history => {
        history.push(data);
        return history.slice(-10); // Keep last 10 scrapes
      })
    });
    
    // Copy to clipboard
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    
    // Download as file
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({
      url: url,
      filename: `amazon-product-${Date.now()}.json`
    });
    
    console.log('Data stored successfully:', data);
    
  } catch (error) {
    console.error('Error storing data:', error);
  }
}

// Helper function to get scraped data history
async function getScrapedDataHistory() {
  const result = await chrome.storage.local.get('scrapedDataHistory');
  return result.scrapedDataHistory || [];
}