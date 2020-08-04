// https://qiita.com/yamamow/items/ec8d2de7773d55345c1a#%E7%94%A8%E6%84%8F%E3%81%99%E3%82%8B%E3%82%82%E3%81%AE
// プロパティに持たせているもの：
// -----------------------------------------------------------------------
const App_url = PropertiesService.getScriptProperties().getProperty("App_url");
const ss_id = PropertiesService.getScriptProperties().getProperty("ss_id");
// -----------------------------------------------------------------------

const spread = SpreadsheetApp.openById(ss_id);
const sheet = spread.getSheetByName('database');

//スプレッドシートの項目が増えた場合、以下の関数を修正してください。
function getParameter(ary1, e) {
  // -----------------------------------------------------------------------
  //項目が増えたら増やす ーーーーーーーーーーA列は行数（※固定）、B列はタイムスタンプ（※固定）
  ary1.push(e.parameters.d_item2); //C列
  ary1.push(e.parameters.d_item3); //D列
  ary1.push(e.parameters.d_item4); //E列
  ary1.push(e.parameters.d_item5); //F列
  ary1.push(e.parameters.d_item6); //G列
  ary1.push(e.parameters.d_item7); //H列
  ary1.push(e.parameters.d_item8); //I列
  ary1.push(e.parameters.d_item9); //J列

  // -----------------------------------------------------------------------
  return ary1;
}

function doGet(e) {
  //初期表示かlistの時
  if (e.parameter.mode == 'list' || e.parameter.mode == null) {
    var template = HtmlService.createTemplateFromFile('index');
    var ItemNameList = getItemNameList(6);
    tmp1 = getNewDataList();
    var res3 = [];
    for(var i = 0; i < tmp1.length; i++){
      res3.push(getCellValue(tmp1[i][0], 6));
    }
    template.res = res3;
  } 
  //新規か編集の時
  if (e.parameter.mode == 'new' || e.parameter.mode == 'edit') {
    var template = HtmlService.createTemplateFromFile(e.parameter.mode);
    var ItemNameList = getItemNameList(-1);
    for (var i = 0; i < ItemNameList[1].length; i++){
      Logger.log(ItemNameList[1][i]);
      if (ItemNameList[1][i] == 'select' || ItemNameList[1][i] == 'radio' || ItemNameList[1][i] == 'checkbox') {
        var tmp1 = getMasterData(ItemNameList[2][i]); 
        ItemNameList[2][i] = tmp1; 
      }
    }
  }
  //編集時は更に
  if (e.parameter.mode == 'edit') {
    var editRow = e.parameter.row;
    template.row = editRow;
    template.res = getCellValue(editRow, -1);
  }

  template.itemName = ItemNameList;
  return template.evaluate();
}

//主にCSSをインクルードするためのもの
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  //Logger.log('doPost');
  //var ss = SpreadsheetApp.getActiveSpreadsheet();
  //var d_sheet = ss.getSheetByName('database');
  var date = new Date();
  // 今日の日付を表示
  date1 = Utilities.formatDate( date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  //すべて処理後は一覧表示するのでindexを指定
  var template = HtmlService.createTemplateFromFile('index');
  var ItemNameList = getItemNameList(6);             //★6列を指定
  template.itemName = ItemNameList;  

  //編集時
  if (e.parameter.mode == 'edit') {
    Logger.log('編集時');
    var ary1 = [];
    var d_row = e.parameters.d_item0;
    ary1.push(d_row);
    ary1.push(date1);
    ary1 = getParameter(ary1, e);
    var ary2 = [];
    ary2.push(ary1);
    var ary3 = [];
    ary3 = shapParameter(ary2); //チェクボックスなどのデータ加工
    //保存
    dataSave(sheet, d_row,1,1,ary2[0].length, ary3);

    //一覧表示
    tmp1 = getNewDataList();
    var res3 = [];
    for(var i = 0; i < tmp1.length; i++){
      res3.push(getCellValue(tmp1[i][0], 6));
    }
    template.res = res3;

　//新規作成時
  }else if (e.parameter.mode == 'new') {
    Logger.log('新規作成時');

    var ary1 = [];
    ary1.push(sheet.getLastRow()+1);
    ary1.push(date1);
    ary1 = getParameter(ary1, e);
    var ary2 = [];
    ary2.push(ary1);
    var ary3 = [];
    ary3 = shapParameter(ary2); //チェクボックスなどのデータ加工
    //保存
    dataSave(sheet, sheet.getLastRow()+1, 1, 1, ary2[0].length, ary2);

    //一覧表示
    tmp1 = getNewDataList();
    var res3 = [];
    for(var i = 0; i < tmp1.length; i++){
      res3.push(getCellValue(tmp1[i][0], 6));
    }
    template.res = res3;

  //検索時 
  } else {
    var res2 = rowSearch(e.parameter.search);
    var res3 = [];
    for(var i = 0; i < res2.length; i++){
      res3.push(getCellValue(res2[i], 6));
    }
    //<?= res ?> がHTMLにあること
    template.res = res3;
  }  
  return template.evaluate();
}

//データを加工する
//チェックボックスのデータをカンマ区切りの文字列として加工する
function shapParameter(ary) {
  Logger.log('shapParameterX');
  var itemNameA = getItemNameList(-1);
  for (var i = 0; i < itemNameA[1].length; i++) {
    Logger.log(itemNameA[1][i]);
    if (itemNameA[1][i] == 'checkbox'){
      ary[0][i] = ary[0][i].join();      
    }
  }
  return ary;
}

//マスターデータを取得
function getMasterData(col) {
  var master_sheet = spread.getSheetByName('itemmaster');
  var values = master_sheet.getRange(2, col, master_sheet.getRange(2, col).getNextDataCell(SpreadsheetApp.Direction.DOWN).getRow()-1, 1).getValues();
  Logger.log('Masterデータを取得');
  Logger.log(values);
  return values;
}

//更新や新規登録を行う
//排他制御を掛けるので更新処理を一か所にまとめた
function dataSave(sheet, row1, col1, row2, col2, data){
  var msg = "";

  //ドキュメントロックを使用する
  var lock = LockService.getDocumentLock();

  //30秒間のロックを取得
  try {
    //ロックを実施する
    lock.waitLock(30000);

    Logger.log('data');
    Logger.log(data);

    //ここにメインルーチンを記述する
    sheet.getRange(row1, col1, row2, col2).setValues(data);

    //メッセージを格納
    msg = "保存完了";

  } catch (e) {
    //ロック取得できなかった時の処理等を記述する
    var checkword = "ロックのタイムアウト: 別のプロセスがロックを保持している時間が長すぎました。";

    //通常のエラーとロックエラーを区別する
    if(e.message == checkword){
      //ロックエラーの場合
      msg = "更新処理中でした";
    }else{
      //ソレ以外のエラーの場合
      msg = e.message;
    }  　 

  }　finally　{
    //ロックを開放する
    lock.releaseLock();

    //メッセージを表示する
    //ui.alert(msg);
  }
}


//項目名称を取得する
function getItemNameList(col){
  var res = [];
  if (col == -1) {
    var values = sheet.getRange(1, 1, 3, sheet.getLastColumn()).getValues();
  } else {
    var values = sheet.getRange(1, 1, 1, col).getValues();
  }
  Logger.log('values getItemNameList');
  Logger.log(values);
  return values;
}

//タイムスタンプの新しい１０件を取得する。[行番号,日付]の二次元配列で時間で降順
//スプレッドシートの左から６列までとする
function getNewDataList(){
  var res = [];
  //2,3行目にHTMLのタグのタイプ、設定値を入れたので４行目からの取得とする
  var values = sheet.getRange(4, 1, sheet.getLastRow()-1, 2).getValues();
  //ソート　sorting_asc　sorting_desc
  values.sort(sorting_desc);
  for (var i = 0; i < 10; i++){
    res.push(values[i]);
  }
  return res;
}

//スプレッドシート内を文言で検索し行番号を返す（同じ行内に複数出てくると抽出結果も重複する
function rowSearch(str){
  var res = [];
  var textFinder = sheet.createTextFinder(str);
  var ranges = textFinder.findAll();
  for(var i = 0; i < ranges.length; i++){
    var range = sheet.getRange(ranges[i].getA1Notation());
    res.push(range.getRow());
  }
  var res2 = uniqueArray(res);

  return res2;
}

//行番号からセル値を取得
function getCellValue(row, col){
  // そのシートにある (1, 1) のセルから3行目までのセル範囲を取得
  if (col == -1 ) {
    var range = sheet.getRange(row, 1, 1, sheet.getLastColumn());
  } else {
    var range = sheet.getRange(row, 1, 1, col);
  }
  // そのセル範囲の値を取得
  var values = range.getValues(); 
  values[0][0] = row;
  values[0][1] = Utilities.formatDate( values[0][1], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  return values[0];
}

//一次配列から重複を排除する
function uniqueArray(ary){
  var res = [];
  res = ary.filter(function(value, index, self){ 
                       return self.indexOf(value) === index;
                   });
  return res;
}
//ソート昇順
function sorting_asc(a, b){
  if(a[1] < b[1]){
    return -1;
  }else if(a[1] > b[1] ){
    return 1;
  }else{
   return 0;
  }
}
//ソート降順
function sorting_desc(a, b){
  if(a[1] > b[1]){
    return -1;
  }else if(a[1] < b[1] ){
    return 1;
  }else{
   return 0;
  }
}