import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import puppeteer from 'puppeteer';
import axios from 'axios';




const CONFIG = {
    wpApiUrl: 'https://profitbooking.in/wp-json/scraper/v1/tradingview',
};




const GOOGLE_SHEET_CONFIG = {
    sheetId: '1LK8uo_pDJkMUKtF2-MwpCo4nyh_EHzcFuV0_UuN6LXQ',
    sheetName: 'Sheet1',
    serviceAccount: {
        email: 'stockmarketdata@stock-data-461213.iam.gserviceAccount.com',
        privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9JZpE3AfwzdAZ\nYZ6AnaRm5E1Y1pJwFM0VnYE3KgJ7wL8f0b4XaAQd2JBv8KGtTSeqPDIsDx1azIwb\nbZK63zy9ubE6SyEb67bUPCMHjqqgR1xbXHnfuMzkCb9oUhgPUiqxXZhQdee4MI7T\nMmr/PYGF8Q3bbQzoSpmetgsKbFor6R1fZQLTZDG4/1ed9QhTvIQ35YFfChSTKQpK\nA5cqX6xN6t3VGO9uoMlcvo89/VH781uN9GyU9qWElD3BwmaoLN3Di7j1LNcafSPe\nzrUdPgvCrq/7S5wZIvtFXBvC984iq+sp8BiXSAHGgqMolGGFnuRLsQY05HkNjhvM\nbFOQhv4TAgMBAAECggEAPLmkUCQ2Fmz1ORjaqt8xp2j3niRxajN7bkudbwj5OCL3\nGW+csGYQIEblhFLEjV9+cwyVbQjDO2H9P1cL6xv9o8nIqPby38Rq87OE6Ym3pPKU\nJ67GX/m0KigpAASPPef61eu/GWHpLXzFde+zY1OrUEXGVaKqqK8+p7I5VDTaNEs6\nDX7QrWV6STg78FWIbXRFjLpYF8PHLj9ITxUX05fvvpmZTX5+QZWykxvX4CHO80yE\nqd+XxVdwtkBuWS+7oVB57+9NQFGUD5f5hWWzXRUEmGSVGPyZ6+6kAGtsqARex/Du\n8VQdk3UMKpKR/eQxdowqiLlf55pq2sty51zCu38OEQKBgQD9rmjJsyFQvDilni/P\nnl7xnGivrTyf4xTLVRHv7leCnAsSrnqbo6sILpHr5/t2r/IiOGtQOILfA3DADrM+\nPOvjd8mLFVndX/Rpak5qKlENJcAueWfwGKLDjubhWCfV+x+TcNHiIroJ2TtQRmQD\n0EapxzsQP2KwSh6L98HHIcX84wKBgQC+4DBThp7ULeHIgdq2G6B3hHy0qaiHk6hL\nHo/6RBhtEbc0obJEGK7z7NzjuV3t8pb8+AROXL3fMe+Mf8riixG660b8ZtsOTQx+\n5J4Rf7rdRTk96zXtlnubbT5rxHC6e3F3l2cLrNmN9PJwmIotuY8WsWgmT5yn1LDl\ncjocsAtxEQKBgQDKfWT3WxzErPkqedIAD5IJmaeWUtmJZmE6zHS856rCfnv4NX14\nrnPe3A1uGIYIfvjvh8lhBzqveLePFizNCSPhNcSSWECbC/S0ED73Tz/TFscIUbA9\nXezN3Es+pHdnvkO+FNfzgXSuV8+YjBdZU+6TpovmtDG6Ne+cGe97W+IFsQKBgCf2\nVgfWwoAXzxKkpT7FT/ZV5aoJb0BbWLvJfUlfYmHLeLjrNaBuLorhR2niEFlWFeiG\noJgrcJE/KjEXPEnr5d1ljuofOrOmy/vxL2rofB4BdTeSfCru+5gR6iSz7woL+Dia\nmTdni/DdnLiYJy3lkKCmqfCDcH/u1s5i+OmyreKRAoGBAMYtXPBqzHzGk/dPZOqF\nBsQdKpsQcdRvbpr2cMNTGBoAEqDMA9yjrT3+nsoEWJx7z4HSN5IjMl+KsBg8Ns3m\nRxYTZWYyTEm1yyU1NR1RcXjpEyzyk0Vi62I3bQJnXEA/mreHH/P4tW9Zeq2+gUXc\n80bvbl9yXX5xljGOMFfG7Y+9\n-----END PRIVATE KEY-----\n`,
    },
};






async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;


                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
}


async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function storeInWordPress(data) {
    try {
        const response = await axios.post(CONFIG.wpApiUrl, {
            Headline: data.headline,
            Fullarticle: data.content,
            Provider: data.provider || 'General',
            Symbol: data.symbol,
            date: data.timestamp || new Date().toISOString()
        }, {
            headers: {
                'Content-Type': 'application/json',

            }
        });


        console.log('Stored in WordPress:', response.data);
        return true;
    } catch (error) {
        console.error('WP API Error:', error.response?.data || error.message);
        return false;
    }
}








async function getStockUrlsFromSheet() {
    const auth = new google.auth.JWT(
        GOOGLE_SHEET_CONFIG.serviceAccount.email,
        null,
        GOOGLE_SHEET_CONFIG.serviceAccount.privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );


    const sheets = google.sheets({ version: 'v4', auth });


    try {
        const headerResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_CONFIG.sheetId,
            range: `${GOOGLE_SHEET_CONFIG.sheetName}!1:1`,
        });


        const headers = headerResponse.data.values ? headerResponse.data.values[0] : [];
        if (headers.length === 0) {
            throw new Error('Could not read headers from the Google Sheet. Make sure the sheet is not empty.');
        }


        const scrapLinkColIndex = headers.indexOf('Scrap_Link');
        const symbolColIndex = headers.indexOf('Symbol');
        const stockNameColIndex = headers.indexOf('Stock name');


        if (scrapLinkColIndex === -1 || symbolColIndex === -1 || stockNameColIndex === -1) {
            throw new Error('Required columns (Scrap_Link, Symbol, Stock name) not found in the Google Sheet.');
        }


        const startCol = Math.min(symbolColIndex, stockNameColIndex, scrapLinkColIndex);
        const endCol = Math.max(symbolColIndex, stockNameColIndex, scrapLinkColIndex);
        const dataRange = `${GOOGLE_SHEET_CONFIG.sheetName}!${String.fromCharCode(65 + startCol)}:${String.fromCharCode(65 + endCol)}`;


        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_CONFIG.sheetId,
            range: dataRange,
        });


        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found in the Google Sheet.');
            return [];
        }


        const stockData = rows.slice(1).map(row => ({
            Symbol: row[symbolColIndex - startCol],
            "Stock name": row[stockNameColIndex - startCol],
            link: row[scrapLinkColIndex - startCol],
        })).filter(entry => entry.link);


        console.log(`Loaded ${stockData.length} stock URLs from Google Sheet.`);
        return stockData;


    } catch (error) {
        console.error('Error accessing Google Sheet:', error.message);
        if (error.code === 403) {
            console.error('Permission denied. Make sure the service account has read access to the Google Sheet.');
        }
        return [];
    }
}


async function scrapeTradingViewNews() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();


    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');


    let stockUrls = [];
    try {
        stockUrls = await getStockUrlsFromSheet();
        if (stockUrls.length === 0) {
            console.log('No stock URLs found to process. Exiting.');
            await browser.close();
            return;
        }
    } catch (error) {
        console.error(`Failed to retrieve stock URLs from Google Sheet: ${error.message}`);
        await browser.close();
        return;
    }


    for (const stockEntry of stockUrls) {
        const stockName = stockEntry["Stock name"];
        const stockSymbol = stockEntry.Symbol;
        const stockLink = stockEntry.link;


        console.log(`\n--- Processing news for ${stockName} (${stockSymbol}) from ${stockLink} ---`);


        try {
            await page.goto(stockLink, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            console.log(`Successfully loaded news page for ${stockSymbol}.`);
        } catch (error) {
            console.error(`Failed to load news page for ${stockSymbol}: ${error.message}`);
            continue;
        }


        await autoScroll(page);
        await delay(2000);


        const articlesOnPage = await page.$$eval('a[class*="card-HY0D0owe"]', cards =>
            cards.map(card => {
                const link = card.href;


                const headlineEl = card.querySelector('[class*="title-HY0D0owe"]');
                const headline = headlineEl?.getAttribute('data-overflow-tooltip-text') ||
                    headlineEl?.textContent?.trim() ||
                    card.querySelector('[data-qa-id="news-headline-title"]')?.textContent?.trim();


                if (headline && headline.toLowerCase().includes('sign in to read exclusive news')) {
                    return null;
                }


                const providerEl = card.querySelector('[class*="provider-HY0D0owe"] span, [class*="source-HY0D0owe"] span');
                const provider = providerEl?.textContent?.trim();


                const symbolImgs = card.querySelectorAll('ul.logo-HY0D0owe img.logo-PsAlMQQF');
                let cardSymbol = null;
                if (symbolImgs.length > 0) {
                    const codes = Array.from(symbolImgs).map(img => {
                        const src = img.src;
                        const match = src.match(/\/([A-Z]{2})\.svg$/);
                        return match ? match[1] : null;
                    }).filter(Boolean);
                    if (codes.length > 0) {
                        cardSymbol = codes.join('');
                    }
                }


                let timestamp = null;
                const timeEl = card.querySelector('time');
                const timeFormatEl = card.querySelector('time-format');


                if (timeEl) {
                    timestamp = timeEl.getAttribute('datetime');
                }
                if (!timestamp && timeFormatEl) {
                    timestamp = timeFormatEl.getAttribute('timestamp');
                }
                if (!timestamp) {
                    const relativeTimeEl = card.querySelector('relative-time');
                    timestamp = relativeTimeEl?.getAttribute('event-time');
                }


                return {
                    symbol: cardSymbol,
                    headline,
                    provider,
                    link,
                    timestamp
                };
            }).filter(article => article && article.headline)
        );


        console.log(`Found ${articlesOnPage.length} articles on ${stockSymbol}'s news page.`);


        const articlesToProcess = articlesOnPage;
        let articlesStoredForThisStock = 0;


        for (const [index, article] of articlesToProcess.entries()) {
            if (!article.link) {
                console.log(`Skipping article ${index + 1} with no link for ${stockSymbol}`);
                continue;
            }


            const articlePage = await browser.newPage();
            console.log(`Processing article ${index + 1}/${articlesToProcess.length} for ${stockSymbol}: "${article.headline}"`);


            try {
                await articlePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
                await articlePage.goto(article.link, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });


                const contentSelectors = [
                    'div[class*="body-KX2tCBZq"]',
                    'div[class*="content-KX2tCBZq"]',
                    'article[data-role="article"] div[class*="content"]',
                    'div[class*="body"]',
                    'div.article-body'
                ];


                let content = null;
                for (const selector of contentSelectors) {
                    try {
                        await articlePage.waitForSelector(selector, { timeout: 5000 });
                        content = await articlePage.$eval(selector, el => el.innerText.trim());
                        if (content) break;
                    } catch (e) {
                        continue;
                    }
                }


                if (!content) {
                    console.log(`Could not extract content for article ${index + 1} for ${stockSymbol}`);
                    continue;
                }


                const restrictedPhrases = [
                    'sign in to read exclusive news',
                    'login or create a forever free account',
                    'subscribe to read this article',
                    'this article is reserved for our members'
                ];


                if (restrictedPhrases.some(phrase => content.toLowerCase().includes(phrase))) {
                    console.log(`Skipping restricted article for ${stockSymbol}: "${article.headline}"`);
                    continue;
                }


                const wpData = {
                    headline: article.headline,
                    content: content,
                    symbol: stockSymbol,
                    provider: article.provider,
                    timestamp: article.timestamp
                };


                console.log('Data to be sent to WordPress:', wpData);


                const stored = await storeInWordPress(wpData);
                if (stored) {
                    articlesStoredForThisStock++;
                    console.log(` Successfully stored article ${index + 1}/${articlesToProcess.length} for ${stockSymbol} in WordPress`);
                }


            } catch (error) {
                console.error(` Error processing article ${index + 1} for ${stockSymbol}: ${error.message}`);
            } finally {
                if (!articlePage.isClosed()) {
                    await articlePage.close();
                }
            }
        }
        console.log(`Finished processing ${articlesStoredForThisStock} articles for ${stockSymbol}.`);
    }


    console.log('\n--- Scraping Complete ---');
    console.log(`Finished processing all stock URLs from Google Sheet.`);


    await browser.close();
    console.log('\nBrowser closed.');
}


scrapeTradingViewNews().catch(console.error);