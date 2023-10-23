const { load } = require("cheerio");
const NameExtractor = require("./getName")


/**
 * Description
 * @param {string} html
 * @param {string} selectors
 * @returns {Array}
 */
class BCAParser {
    constructor(html, selectors) {
        this.$ = load(html);
        this.selectors = selectors;
    }

    parse() {
        let accountNo = this.$(this.selectors.accountNoField).parent().next().next().text().trim();
        let name = this.$(this.selectors.nameField).parent().next().next().text().trim();
        let periode = this.$(this.selectors.periodeField).parent().next().next().text().trim();
        let mataUang = this.$(this.selectors.mataUangField).parent().next().next().text().trim();

        let transactions = [];
        this.$(this.selectors.transactionsTable).find('tr').each((i, elem) => {
            let tanggal = this.$(elem).find('td:nth-child(1)').text().trim();
            if (tanggal === 'PEND') {
                tanggal = periode.split('-')[0].trim();
            }

            let keterangan = this.$(elem).find('td:nth-child(2)').text().trim();
            keterangan = keterangan.replace(/\s+/g, ' ');
            let nama = NameExtractor.extractBCAMutationName(keterangan)

            let cab = this.$(elem).find('td:nth-child(3)').text().trim();
            let mutasi = this.$(elem).find('td:nth-child(5)').text().trim();
            let nominal = this.$(elem).find('td:nth-child(4)').text().trim();
            let saldoakhir = this.$(elem).find('td:nth-child(6)').text().trim();
            if(tanggal === "Tgl."){
            }else if(tanggal === "Date"){

            }else{
                transactions.push({tanggal, keterangan, nama, cab, mutasi, nominal,saldoakhir});
            }
        });



        let settlement = {};
        this.$(this.selectors.settlementTable).find('tr').each((i, elem) => {
            let item = this.$(elem).find('td:nth-child(1)').text().trim();
            let value = this.$(elem).find('td:nth-child(3)').text().trim();
            if (item !== '') {
                settlement[item] = value;
            }
        });

        return { data: [{accountNo, name, periode, mataUang}], mutasi: transactions , settlement};
    }
}

class BNIParser{
    parse(data){
        let arrayfilter = [];
        for (let i = 0; i < data.length; i++) {
            const filtered = data[i].filter(function (el) {
                return el != "-";
            });
            if (filtered.length > 0) {
                arrayfilter.push(filtered);
            }
        }
    
        let arr = [];
        const res = arrayfilter.slice(6, -7);
        const string = res.join("\n");
        const potong = string.split("Tanggal Transaksi");
    
        for (let i = 1; i < potong.length; i++) {
            let potong2 = potong[i].split("\n");
            let mutasi; 
            if(potong2[5] === "Cr"){
                mutasi = "CR"
            } else if(potong2[5] === "Db"){
                mutasi = "DB"
            }
            let name;
            const regex = /TRANSFER DARI (Bpk|Sdr|Ibu) (.*)/;
            const match = potong2[3].match(regex);
            if (match) {
                name = match[2];
            }
            arr.push({
                tanggal: potong2[1],
                keterangan: potong2[3],
                mutasi: mutasi,
                nominal: potong2[7],
                saldoakhir: potong2[9],
                nama: name 
            });
        }
        return arr;
    }
    
}


module.exports = {
    BNIParser,
    BCAParser
};
