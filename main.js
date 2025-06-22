import puppeteer from "puppeteer";
import csv from "csvtojson";
import axios from "axios";

const CONFIG = {
    wpApiUrl: 'https://profitbooking.in/wp-json/scraper/v1/tradingview',
    paths: {
        pageUrl: 'https://in.tradingview.com',
        inputFile: 'Stock Names_Symbols.csv',
    }
};

const getNewsArticleData = async (browser, path) => {
    const page = await browser.newPage();
    await page.goto(CONFIG.paths.pageUrl + path, { waitUntil: 'networkidle2' });

    const newsArticle = await page.$eval(
        'div.body-KX2tCBZq > div:nth-child(2) > span',
        el => el.textContent.trim()
    ).catch(() => null);

    await page.close(); // Close the page after extraction
    return newsArticle;
};


const extractandSaveCompanyData = async (browser, link, symbol) => {
    const page = await browser.newPage();

    try {
        await page.goto(link, { waitUntil: 'networkidle2' });
        await page.waitForSelector('div.list-iTt_Zp4a', { timeout: 2000 });

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
                'Content-Type': 'application/json',
            }
        });

        // console.log('Stored in WordPress:', response.data);
    } catch (error) {
        console.error('WP API Error:', error.response?.data || error.message);
    }
}

const run = async (jsonData, idx) => {
    let i = idx;
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        for (; i < jsonData.length; i++) {
            await extractandSaveCompanyData(browser, jsonData[i]['Scrap_Link'], jsonData[i]['Symbol']);
        }

        await browser.close();
        return i;
    } catch (error) {
        console.error(`Error processing:`, error.message);
        return i; // Return the current index to continue later
    }
}

const main = async () => {
    const jsonData = await csv().fromFile(CONFIG.paths.inputFile);

    let idx = 0;
    if (idx < jsonData.length) {
        // Continue processing the next batch if browser timeout occurs
        console.log(`Processing next batch from index ${idx}`);
        idx = await run(jsonData, idx);
    } else {
        console.log('All data processed successfully.');
    }
}

main();
