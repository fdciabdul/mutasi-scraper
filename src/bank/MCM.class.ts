import ScraperBank from "../BrowserClasses";
import MANDIRISelector from "../helper/selector/MANDIRISelector";
import log from "../helper/utils/Logger";
import NameExtractor from "../helper/utils/getName";

/**
 * MandiriMCM class for scraping Mandiri (Bank Mandiri) data.
 * @class
 * @extends ScraperBank
 */
class MandiriMCM extends ScraperBank {
  private corpID: string;
  private username: string;
  private password: string;
  private noacc: string;
  log: (message: any) => any;
  
  constructor(corpID: string, user: string, password: string, noacc: string, args: any) {
    super(user, password, args);
    this.corpID = corpID;
    this.username = user;
    this.password = password;
    this.noacc = noacc;
    this.log = log;
  }

  async getStatement(): Promise<{ message: string; data: any }> {
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

      let jsonData: any;

      page.on("response", async (response: { request: () => any; json: () => any; }) => {
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
 

  private formatTransactionData(transaction: any): any {
    try {
      const postingDate = new Date(transaction.gatewayPostingDate);
      const formattedDate = this.formatDate(postingDate);
      return {
        tanggal: formattedDate,
        date: formattedDate,
        deskripsi: transaction.remarks.trim().replace(/\.{2,}/g, ''),
        name:  NameExtractor.extractMandiriMutationName(transaction.remarks),
        type: transaction.debitAmount === "0" ? "kredit" : "debit",
        nominal: transaction.debitAmount === "0" ? transaction.creditAmount : transaction.debitAmount
      };
    } catch (error) {
      console.log(`Error formatting transaction data: ${error}`);
    }
  }

  private formatDate(date: Date): string {
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

export default MandiriMCM;