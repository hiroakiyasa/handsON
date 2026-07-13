# GitHub Copilot ハンズオン（SharePoint Framework版）

白背景の初心者向けハンズオンを、SharePoint Onlineのモダンページに配置できるSPFx Webパーツです。

- Microsoft Graph APIは使用しません。
- 進捗は同一サイトのSharePointリストへ、サインイン中ユーザー本人の項目として保存します。
- リストは「本人が作成した項目だけ閲覧・編集」に設定します。
- 動画はSharePoint／OneDrive上のStreamで管理し、Webパーツ設定から参照します。
- 画像、CSS、JavaScriptは`.sppkg`内に含まれるため、別の静的Webサーバーは不要です。

## 動作要件

- SharePoint Online
- SPFx 1.23.2
- Node.js 22.14以上、23未満
- 初回の進捗リスト作成時だけ、サイト所有者またはリスト作成権限があるユーザー

## ビルド

```bash
npm install
npm run generate-site
npm run build
```

生成物：`sharepoint/solution/github-copilot-hands-on.sppkg`

## SharePointへの配置

1. SharePoint管理者がテナントの「アプリ カタログ」を開きます。
2. `github-copilot-hands-on.sppkg`をアップロードし、展開します。
3. 利用するサイトで「新規 → ページ」を選び、モダンページを作成します。
4. ページ編集画面の「＋」から「GitHub Copilot ハンズオン」を追加します。
5. 最初の1回はサイト所有者がページを開きます。`CopilotHandsOnProgress`リストが自動作成されます。
6. 「サイト コンテンツ → CopilotHandsOnProgress → 設定 → 詳細設定」で次を確認します。
   - 読み取りアクセス：ユーザー本人が作成したアイテム
   - 作成および編集のアクセス：ユーザー本人が作成したアイテム
7. 受講者へページの閲覧権限を付けます。進捗を保存する場合は、進捗リストだけに受講者の「投稿」権限も必要です。

受講者へリスト書き込み権限を付与できない場合は、Webパーツ設定の「進捗を保存する」をオフにしてください。進捗カード、チェック状態、リセット操作がページから除外されます。

## 進捗データの仕組み

保存先はOneDriveではなく、ページと同じSharePointサイトの`CopilotHandsOnProgress`リストです。

- `Author`：SharePointが自動設定する本人アカウント
- `ProgressJson`：13個のチェック状態
- アイテムレベル権限：本人の項目だけ閲覧・更新

したがって、他の受講者が同時にアクセスしても進捗は混ざりません。同じMicrosoft 365アカウントであれば、別のPCやブラウザーでも再開できます。ブラウザーの`localStorage`には進捗を保存しません。

## 3本の動画をアップロードする方法

### 1. 動画用フォルダーを作る

1. ハンズオンを置くSharePointサイトを開きます。
2. 「ドキュメント」ライブラリを開きます。
3. `CopilotHandsOnVideos`フォルダーを作成します。
4. 次の3本のMP4をアップロードします。
   - GitHub Copilotを用いたDRBFM作成紹介
   - PDFからテキスト抽出する紹介動画
   - Panel／INCAデータ解析エージェント

動画をSPFxパッケージやGitHubへ含めないでください。SharePointへ置くことで、社内アカウントとファイル権限がそのまま適用されます。

### 2. 閲覧権限を設定する

各動画の「アクセス許可の管理」で、ハンズオン受講者に閲覧権限を付けます。「リンクを知っているすべてのユーザー」ではなく、社内の対象者・対象グループまたは「既存のアクセス権を持つユーザー」を推奨します。

### 3. ページ内で再生する

1. SharePointで動画を開きます。新しいStreamプレーヤーで表示されます。
2. 「共有 → 埋め込みコード」を選び、`iframe`コードをコピーします。
3. ハンズオンページを編集します。
4. Webパーツの鉛筆アイコンを押します。
5. 右側の設定欄へ、3本それぞれの埋め込みコードを貼り付けます。
6. ページを再公開します。

Webパーツは埋め込みコードから`src`を抽出し、16:9の動画プレーヤーを該当する事例内へ表示します。

テナント設定で埋め込みコードを取得できない場合は、動画の「リンクをコピー」で取得したHTTPS共有URLを貼り付けます。この場合は「動画を見る」ボタンから別タブでStreamを開きます。

## 更新方法

リポジトリ直下の`index.html`または`styles.css`を更新した後、次を実行します。

```bash
npm run generate-site
npm run build
```

`siteContent.ts`は自動生成ファイルです。直接編集しないでください。

## 公式資料

- [SharePoint Frameworkの互換性](https://learn.microsoft.com/sharepoint/dev/spfx/compatibility)
- [SPFxソリューションの展開](https://learn.microsoft.com/sharepoint/dev/spfx/web-parts/get-started/serve-your-web-part-in-a-sharepoint-page)
- [SharePoint RESTをSPFxから利用する](https://learn.microsoft.com/sharepoint/dev/spfx/connect-to-sharepoint)
- [SharePoint上のStream動画を共有する](https://learn.microsoft.com/stream/streamnew/share-video)
