import puppeteer from "puppeteer";
import csv from "csvtojson";
import axios from "axios";

// to get the WP API token, run the following command in terminal or postman:
// curl -X POST https://profitbooking.in/wp-json/jwt-auth/v1/token \ -d "username=yourusername&password=yourpassword"  

const CONFIG = {
    wpApiUrl: 'https://profitbooking.in/wp-json/scraper/v1/tradingview',
    paths: {
        pageUrl: 'https://in.tradingview.com',
        inputFile: 'Stock Names_Symbols.csv',
    }
};

const newPage = async (browser) => {
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36");

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.setViewport({ width: 1920, height: 1080 });
    return page;
}

const getNewsArticleData = async (browser, path) => {
    const page = await newPage(browser);
    await page.goto(CONFIG.paths.pageUrl + path, { waitUntil: 'domcontentloaded' });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newsArticle = await page.$eval(
        'div.body-KX2tCBZq > div:nth-child(2) > span',
        el => el.textContent.trim()
    ).catch(() => null);

    await page.close(); // Close the page after extraction
    return newsArticle;
};


const extractandSaveCompanyData = async (browser, link, symbol) => {
    const page = await newPage(browser);

    // await page.setDefaultNavigationTimeout(2000);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before navigating

    try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForSelector('div.list-iTt_Zp4a', { timeout: 5000, visible: true });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract news items directly from the page
        const newsMeta = await page.$$eval('div.list-iTt_Zp4a > a.card-BpSwpmE_', nodes =>
            nodes.map(newsItem => {
                const href = newsItem.getAttribute('href');
                const dateElem = newsItem.querySelector('span.date-BpSwpmE_ time');
                const date = dateElem ? dateElem.getAttribute('datetime') : null;
                const titleElem = newsItem.querySelector('.title-DmjQR0Aa');
                const title = titleElem ? titleElem.textContent : null;
                const providerElem = newsItem.querySelector('.provider-BpSwpmE_');
                const provider = providerElem ? providerElem.textContent : null;

                const restrictedPhrases = [
                    'sign in to read exclusive news',
                    'login or create a forever free account',
                    'subscribe to read this article',
                    'this article is reserved for our members'
                ];

                if (date && (new Date() - new Date(date) > 90 * 24 * 60 * 60 * 1000)) return null;
                if (title && !restrictedPhrases.includes(title.toLowerCase())) {
                    return { href, date, title, provider };
                }
                return null;
            }).filter(meta => meta !== null)
        );

        for (const meta of newsMeta) {
            const fullArticle = await getNewsArticleData(browser, meta.href);
            const newsData = {
                date: meta.date,
                symbol,
                headline: meta.title,
                content: fullArticle || 'Null',
                provider: meta.provider
            };

            await saveDatatoSQL(newsData); // Save news item to SQL
        }

        console.log(`Data extraction completed for: ${link}, items extracted: ${newsMeta.length}.`);
        await page.close(); // Close the page after extraction
    }
    catch (error) {
        console.error(`Page not found for ${link}`, error.message);
        return [];
    }
}

const saveDatatoSQL = async (data) => {
    try {
        const response = await axios.post(CONFIG.wpApiUrl, {
            Headline: data.headline,
            Fullarticle: data.content,
            Provider: data.provider || 'General',
            Symbol: data.symbol,
            date: data.date || new Date().toISOString()
        }, {
            headers: {
                // 'Authorization': `Bearer ${process.env.WP_API_TOKEN}`,
                'Content-Type': 'application/json',
            }
        });

        // console.log('Stored in WordPress:', response.data);
    } catch (error) {
        console.error('WP API Error:', error.response?.data || error.message);
    }
}

const run = async (jsonData, start, end) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--window-size=1920,1080",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
            "--disable-dev-shm-usage",
        ]
    });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before starting

    try {
        for (let i = start; i < end; i++) {
            await extractandSaveCompanyData(browser, jsonData[i]['Scrap_Link'], jsonData[i]['Symbol']);
        }
    } catch (error) {
        console.error(`Error processing:`, error.message);
    }

    await browser.close();
}

const main = async () => {
    const jsonData = await csv().fromFile(CONFIG.paths.inputFile);

    const start = parseInt(process.argv[2]) || 0; // Start index from command line argument or default to 0
    const end = parseInt(process.argv[3]) || jsonData.length; // End index from command line argument or default to 100

    await run(jsonData, start, end);

    console.log('All data processed successfully.');
}

main();
