const ScraperBank = require("../BrowserClasses");
const MANDIRISelector = require("../helper/selector/MANDIRISelector");
const log = require("../helper/utils/Logger");

/**
 * Kopra class for scraping Mandiri (Bank Mandiri) data.
 * @class
 * @extends ScraperBank
 * @memberof Bank
 */
class MandiriMCM extends ScraperBank {
  /**
   * Constructor for Kopra class.
   * @constructor
   * @param {string} corpID - Mandiri corporate ID.
   * @param {string} user - Mandiri username.
   * @param {string} password - Mandiri password.
   * @param {string} noacc - Mandiri account number.
   * @param {boolean} useFingerprintInjector - Flag to use fingerprint injector.
   */
  constructor(corpID, user, password, noacc,useFingerprintInjector) {
    super(user, password,useFingerprintInjector);
    this.corpID = corpID;
    this.username = user;
    this.password = password;
    this.noacc = noacc;
    this.log = log;
  }


  /**
   * Gets the account statement from the Mandiri website.
   * @async
   * @returns {Object} - Result containing a message and data.
   */
  async getStatement() {
    this.log("login sebagai");

    const page = await this.launchBrowser();
    const browser = await page.browser();
    try {
      await page.goto(MANDIRISelector.LOGIN_PAGE.url, {
        waitUntil: "networkidle2",
      });
      await page.setViewport({ width: 1366, height: 768 });

      this.log("Mengarah ke login page..");
      await page.waitForSelector(MANDIRISelector.LOGIN_PAGE.corpIdInput);
      await page.type(MANDIRISelector.LOGIN_PAGE.corpIdInput, this.corpID, {
        delay: 100,
      });
      await page.type(MANDIRISelector.LOGIN_PAGE.userInput, this.username, {
        delay: 100,
      });
      await page.type(MANDIRISelector.LOGIN_PAGE.passInput, this.password, {
        delay: 100,
      });
      await page.click(MANDIRISelector.LOGIN_PAGE.submitButton, { delay: 200 });

      this.log("Menunggu response dari API");
      await page.click(MANDIRISelector.LOGIN_PAGE.submitButton, { delay: 200 });

      await page.waitForTimeout(2000);

      const errorMessageElements = await page.$x(
        MANDIRISelector.LOGIN_PAGE.error_message
      );

      if (errorMessageElements.length > 0) {
        throw new Error("Login failed. User still logged in.");
      }



      await page.waitForXPath(MANDIRISelector.DASHBOARD_PAGE.navbar); // nav selector
      await (await page.$x(MANDIRISelector.DASHBOARD_PAGE.navbar))[0]?.click();

      await (
        await page.$x(MANDIRISelector.DASHBOARD_PAGE.statementLink)
      )[0]?.click();

      await page.waitForNavigation();

      await page.waitForSelector(MANDIRISelector.STATEMENT_PAGE.dropdown);


      await page.waitForTimeout(3000);
      await page.click(MANDIRISelector.STATEMENT_PAGE.dropdown);
      await page.waitForTimeout(3000);
      const searchText = this.noacc;
      const targetElement = await page.waitForXPath(
        `${MANDIRISelector.STATEMENT_PAGE.norek}, '${searchText}')]`
      );
      await page.select(MANDIRISelector.STATEMENT_PAGE.statement_day, "today");

      await targetElement.click();
      await page.waitForSelector(
        MANDIRISelector.STATEMENT_PAGE.submit_statement
      );
      await page.click(MANDIRISelector.STATEMENT_PAGE.submit_statement);
      await page.waitForSelector(MANDIRISelector.STATEMENT_PAGE.nav_log);

      let jsonData;

      page.on("response", async (response) => {
        const request = response.request();
        const requestUrl = request.url();

        if (
          requestUrl ===
          "https://mcm2.bankmandiri.co.id/corporate/secure/widgets/accountOverview/getAccountStatement"
        ) {
          console.log("Response URL:", requestUrl);

          jsonData = await response.json();
        }
      });

      //console.log(jsonDataFromFile);
      await page.waitForSelector(MANDIRISelector.LOGOUT_PAGE.nav_logout);
      await page.click(MANDIRISelector.LOGOUT_PAGE.button_logout, {
        delay: 1000,
      });
      await page.waitForTimeout(1000);
      await browser.close();
      const data = jsonData.details.map(this.formatTransactionData);
      return {
        message : "success get data",
        data : data
      }
    } catch (error) {
      await browser.close();
      return {
        message : "Login failed. User still logged in",
        data : null
      }
      
    }
  }

  /**
   * Formats transaction data received from the Mandiri website.
   * @param {Object} transaction - Raw transaction data.
   * @returns {Object} - Formatted transaction data.
   */
   formatTransactionData(transaction) {
    try {
      const postingDate = new Date(transaction.gatewayPostingDate);
      const formattedDate = formatDate(postingDate);
      return {
        tanggal: formattedDate,
        date: formattedDate,
        deskripsi: transaction.remarks.trim().replace(/\.{2,}/g, ''),
        name: getName(transaction.remarks),
        type: transaction.debitAmount === "0" ? "kredit" : "debit",
        nominal: transaction.debitAmount === "0" ? transaction.creditAmount : transaction.debitAmount
      };
    } catch (error) {
      console.log(`Error formatting transaction data: ${error}`);
    }
  }

  /**
   * Formats a date object to a string.
   * @param {Date} date - Date object to be formatted.
   * @returns {string} - Formatted date string.
   */  
  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(
      date.getSeconds()
    ).padStart(2, "0")}`;
  }
}

module.exports = MandiriMCM;
