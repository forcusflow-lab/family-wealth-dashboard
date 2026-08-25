# 金融データ連携の調査記録

2026年8月18日確認。アプリは金融機関のログインID・パスワード・ワンタイムパスワードを受け取らず、注文・振込・返済等の金融取引も実行しない。現時点では、利用者が各公式アプリまたはWeb画面から出力・確認したデータを、確認付きで取り込む設計を採用する。

## SBI証券NISAスナップショットの扱い

2026年8月18日の提供画面には、総評価額**2,458,610円**、成長投資枠の投資額**239.4万円／240万円**、つみたて投資枠の投資額**0円／120万円**と表示されている。一方、利用者からは「今年のNISA成長枠は使い切っている」と明示されているため、アプリの買付判断では**成長投資枠の残枠を0円**として扱う。画面上の6,000円相当の差異は、表示更新の時差、約定・受渡タイミング、または端数表示等の可能性があるが、本アプリでは推測しない。翌年の枠利用前に証券会社画面で確認する。

| サービス | 公式に確認できた取得経路 | このアプリでの扱い | 連携上の注意 |
|---|---|---|---|
| SBI証券 | My資産・約定履歴のCSV出力 | NISA枠・評価額・保有内容を確認済み数値または公式CSVで更新 | 証券口座のログイン情報・認証コードは扱わない。 |
| 埼玉りそな銀行 | マイゲートの入出金明細CSV/PDF | 口座残高・年払い支出を公式CSV/PDFで確認して更新 | 銀行のログイン情報・認証コードは扱わない。 |
| ジャックス インターコムクラブ | WEB明細サービスのカード・融資明細CSV/PDF（最大15か月） | カード請求額・ローン残高を公式CSV/PDFで確認して更新 | 認証情報の預かり・自動スクレイピングはしない。 |
| ドコモSMTBネット銀行 | 入出金明細CSV/PDF（最大999件） | 口座残高・支出を公式CSV/PDFで確認して更新 | 銀行のログイン情報・認証コードは扱わない。 |

## API調査の記録（本アプリでは採用しない）

SBI証券が公式に案内するAPIは、先物・オプション取引口座の外部ツール向けであり、APIキー発行後に注文・残高照会を扱う取引APIである。NISA、現物株式、投資信託を含む証券総合口座の資産・NISA枠・買付履歴を、任意の個人用家計アプリへ読み取らせる公開APIは、本調査の公式資料では確認できない。したがって本アプリは当該APIを利用しない。

一方、SBI証券とドコモSMTBネット銀行の両方に口座がある場合、ドコモSMTBネット銀行内の**公式アグリゲーションサービス**へ利用者本人が申し込み、銀行Webサイト上でSBI証券の預り残高（口座サマリー）を表示できる。この連携は銀行Webサイト内の表示機能であり、本アプリへデータを提供するAPIではない。データを本アプリへ反映する際は、CSV出力または確認済みの集計値を利用者が入力する方式を維持する。

埼玉りそな銀行とドコモSMTBネット銀行の参照系APIは、いずれも契約済みの電子決済等代行業者を前提とする仕組みである。利用者の指示により、このアプリはこれらのAPIや第三者サービス経由の自動連携を採用しない。

ジャックス インターコムクラブについては、公式サイトでCSV/PDF出力は案内されているが、個人向けの公開APIまたは第三者アプリに対する正規API認可は本調査で確認できない。全サービス共通で、公式CSV/PDFまたは画面で確認した集計値だけを手動更新する方式を採用する。

## 採用する更新方式

| 方法 | 利点 | 留意点 |
|---|---|---|
| 公式CSV・画面スナップショットをアプリへ確認付きで入力 | 追加の金融機関認証が不要で、明細の範囲を利用者が選べる | 定期的な操作が必要 |

## 参照情報

1. [SBI証券：My資産のCSV出力機能](https://www.sbigroup.co.jp/news/pr/2022/1201_13454.html)
2. [SBI証券：取引履歴等ダウンロード（CSV）](https://www.sbisec.co.jp/ETGate/WPLETmgR001Control?OutSide=on&getFlg=on&burl=search_home&cat1=home&cat2=service&dir=service&file=home_kakutei_rei.html)
3. [埼玉りそな銀行：マイゲートの明細CSV/PDFダウンロード](https://www.saitamaresona.co.jp/direct/faq/faq_mygate_0117.html)
4. [埼玉りそな銀行：他社サービス連携機能](https://www.saitamaresona.co.jp/direct/news_c/2019/post_188.html)
5. [ジャックス：インターコムクラブの請求明細確認](https://www.jaccs.co.jp/icmclub/service/meisai.html)
6. [ジャックス：ローン契約内容の確認](https://www.jaccs.co.jp/service/support/procedure/procedure-17.html)
7. [ドコモSMTBネット銀行：入出金明細CSV/PDF](https://help.netbk.co.jp/faq_detail.html?id=834)
8. [三菱UFJ銀行：dスマートバンク終了](https://www.bk.mufg.jp/info/20250925_dsmartbank_end.html)
9. [SBI証券：先物・オプションAPI](https://www.sbisec.co.jp/ETGate/?OutSide=on&getFlg=on&_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl20&_ActionID=DefaultAID&_DataStoreID=DSWPLETmgR001Control&burl=search_op&cat1=op&cat2=none&dir=service&file=op_service_05.html)
10. [SBI証券：ドコモSMTBネット銀行での証券総合口座残高表示](https://www.sbisec.co.jp/ETGate/WPLETmgR001Control?OutSide=on&getFlg=on&burl=search_bank&cat1=bank&cat2=service&dir=service&file=bank_aggregation.html)
11. [埼玉りそな銀行：電子決済等代行業者とのAPI連携方針](https://www.saitamaresona.co.jp/util/dendai_houshin.html)
12. [埼玉りそな銀行：他社サービス連携機能](https://www.saitamaresona.co.jp/direct/news_c/2019/post_188.html)
13. [ジャックス：WEB明細サービス](https://www.jaccs.co.jp/icmclub/webmeisai/)
14. [ドコモSMTBネット銀行：電子決済等代行業者との連携方針](https://www.netbk.co.jp/contents/company/sitepolicy/api-policy/)
15. [ドコモSMTBネット銀行：Zaimとの参照系API連携](https://www.netbk.co.jp/contents/company/press/2018/corp_news_20180220.html)
