const ScraperBank = require("../BrowserClasses");
const {UA} = require("../helper/UA");
const BCASelectors = require("../helper/selector/BCASelector");
const {BCAParser} = require("../helper/Parser");
class ScrapBCA extends ScraperBank {
        constructor(user, pass, args) {
                super(user, pass, args);
        }
        /**
         * Login to BCA
         * @date 2023-05-24
         * @returns {Promise <>}
         */
        async login() {
                try {
                        const page = await this.launchBrowser();
                        await page.setUserAgent(UA());
                        await page.goto(BCASelectors.LOGIN_PAGE.url, {
                                waitUntil: "networkidle2"
                        });
                        await page.waitForSelector(BCASelectors.LOGIN_PAGE.userField);
                        await page.type(BCASelectors.LOGIN_PAGE.userField, this.user, {
                                delay: 100
                        });
                        await page.waitForSelector(BCASelectors.LOGIN_PAGE.passField);
                        await page.type(BCASelectors.LOGIN_PAGE.passField, this.pass);
                        await page.waitForSelector(BCASelectors.LOGIN_PAGE.submitButton);
                        await page.click(BCASelectors.LOGIN_PAGE.submitButton, {
                                delay: 200
                        });
                        page.on('dialog', async dialog => {
                                throw new Error("Alert Box detected");
                        });
                        return page;
                } catch (e) {
                        console.error(e);
                        return null;
                }
        }
        /**
         *  Get Settlement from selected date
         * @date 2023-04-17
         * @param {string} tglawal ( Harus berbentuk string )
         * @param {string} blnawal ( Harus berbentuk string )
         * @param {string} tglakhir ( Harus berbentuk string )
         * @param {string} blnakhir ( Harus berbentuk string )
         * @returns {Promise}
         */
        async getSettlement(tglawal, blnawal, tglakhir, blnakhir) {
                const page = await this.login();
                if (!page) throw new Error("Login failed");
                try {
                        await page.waitForTimeout(2000);
                        await page.goto(BCASelectors.SETTLEMENT_PAGE.url, {
                                waitUntil: "networkidle2"
                        });
                        await page.waitForSelector(BCASelectors.SETTLEMENT_PAGE.settlementLink);
                        await page.click(BCASelectors.SETTLEMENT_PAGE.settlementLink);
                        const pageTarget = page.target();
                        const newTarget = await page.browser().waitForTarget(target => target.opener() === pageTarget);
                        const newPage = await newTarget.page();
                        await newPage.setUserAgent(UA());
                        await newPage.waitForSelector("#startDt", {
                                waitUntil: "networkidle2"
                        });
                        await newPage.reload({
                                waitUntil: "networkidle2"
                        });
                        const padStart2 = num => num.toString().padStart(2, "0");
                        await newPage.select(BCASelectors.SETTLEMENT_PAGE.startDateField, padStart2(tglawal));
                        await newPage.select(BCASelectors.SETTLEMENT_PAGE.startMonthField, blnawal.toString());
                        await newPage.select(BCASelectors.SETTLEMENT_PAGE.endDateField, padStart2(tglakhir));
                        await newPage.select(BCASelectors.SETTLEMENT_PAGE.endMonthField, blnakhir.toString());
                        await newPage.waitForSelector(BCASelectors.SETTLEMENT_PAGE.submitButton);
                        await newPage.click(BCASelectors.SETTLEMENT_PAGE.submitButton, {
                                delay: 1500
                        });
                        await newPage.waitForNavigation();
                        await newPage.waitForSelector(BCASelectors.SETTLEMENT_PAGE.settlementTable, {
                                waitUntil: "networkidle2"
                        });
                        await page.waitForTimeout(3000);
                        const result = await newPage.evaluate(() => document.body.innerHTML);
                        let parser = new BCAParser(result, BCASelectors.PARSING_FIELD);
                        let resultsettlement = parser.parse();
                        const exists = await this.checkIfReturnToLogin(newPage, BCASelectors.LOGIN_PAGE.userField);
                        if (exists) {
                                throw new Error("Loopback detected");
                        }
                        await this.logoutAndClose(page);
                        return resultsettlement;
                } catch (error) {
                        console.error(error);
                        await this.logoutAndClose(page);
                        throw error;
                }
        }
        /**
         * Function to logout and close browser
         * @date 2023-04-17
         * @param {string} page
         * @returns {Promise}
         */
        async logoutAndClose(page) {
                await page.goto(BCASelectors.LOGOUT_PAGE.url, {
                        waitUntil: "networkidle2"
                });
                await this.closeBrowser(page);
        }
        /**
         * Funtion to parse settlement
         * @date 2023-04-17
         * @param {string} html
         * @returns {Promise}
         */
        async checkIfReturnToLogin(page, selector) {
                try {
                        const element = await page.$(selector);
                        return element ?? null;
                } catch (e) {
                        console.error(e);
                        return false;
                }
        }
        async sleep(ms) {
                return new Promise((resolve) => setTimeout(resolve, ms));
        }
}
module.exports = ScrapBCA;
