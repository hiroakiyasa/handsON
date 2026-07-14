import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import { initializeHandsOn } from './handsOnInteractions';
import { ProgressService } from './ProgressService';
import { SharePointVideoService } from './SharePointVideoService';
import { siteAssets, siteCss, siteHtml } from './siteContent';

const DEFAULT_VIDEO_URLS: Record<string, string> = {
  drbfm: 'https://toyotajp.sharepoint.com/:v:/r/sites/msspo_pt-digital/DocLib1/Materials/GitHub_Copilot%E3%82%92%E7%94%A8%E3%81%84%E3%81%9FDRBFM%E4%BD%9C%E6%88%90%E7%B4%B9%E4%BB%8B%20(%E9%9B%BB%E5%8A%9B%E5%A4%89%E6%8F%9B%E3%83%A6%E3%83%8B%E3%83%83%E3%83%88%E9%96%8B%E7%99%BA%E9%83%A8%E6%B9%AF%E6%B5%85S).mp4?csf=1&web=1&e=ngBngF',
  pdf: 'https://toyotajp.sharepoint.com/:v:/r/sites/msspo_pt-digital/DocLib1/Materials/PDF%E3%81%8B%E3%82%89%E3%83%86%E3%82%AD%E3%82%B9%E3%83%88%E6%8A%BD%E5%87%BA%E3%81%99%E3%82%8B%E7%B4%B9%E4%BB%8B%E5%8B%95%E7%94%BB(ICE%E9%96%8B%E7%99%BA%E9%83%A8%E9%87%8E%E5%91%82SN).mp4?csf=1&web=1&e=NgQ3Ob',
  measurement: 'https://toyotajp.sharepoint.com/:v:/r/sites/msspo_pt-digital/DocLib1/Materials/Panel,INCA%E3%83%87%E3%83%BC%E3%82%BF%E8%A7%A3%E6%9E%90%E3%82%A8%E3%83%BC%E3%82%B8%E3%82%A7%E3%83%B3%E3%83%88(%E3%83%91%E3%83%AF%E3%83%88%E3%83%AC%E5%88%B6%E5%BE%A1%E9%96%8B%E7%99%BA%E9%83%A8%E4%B8%8A%E9%87%8ESK).mp4?csf=1&web=1&e=8OkrjZ'
};

export interface ICopilotHandsOnWebPartProps {
  enableProgress: boolean;
  progressListTitle: string;
  drbfmVideoUrl: string;
  pdfVideoUrl: string;
  measurementVideoUrl: string;
}

export default class CopilotHandsOnWebPart extends BaseClientSideWebPart<ICopilotHandsOnWebPartProps> {
  private _shadowRoot: ShadowRoot | undefined;

  public render(): void {
    if (!this._shadowRoot) {
      this.domElement.innerHTML = '';
      this._shadowRoot = this.domElement.attachShadow({ mode: 'open' });
    }

    let renderedHtml = siteHtml;
    Object.keys(siteAssets).forEach(path => {
      renderedHtml = renderedHtml.split(path).join(siteAssets[path]);
    });

    this._shadowRoot.innerHTML = `
      <style>
        :host { display: block; width: 100%; }
        ${siteCss}
        .hands-on-body { min-height: 100vh; }
        .progress-disabled { cursor: default; }
        .progress-disabled > span { opacity: .35; }
        .watch-button.is-disabled { opacity: .55; cursor: not-allowed; }
        .embedded-video { position: relative; width: 100%; aspect-ratio: 16 / 9; margin: 20px 0; overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: #eef5fb; }
        .embedded-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
        .video-loading, .video-error { position: absolute; inset: 0; display: grid; place-items: center; padding: 24px; color: var(--muted); text-align: center; font-size: 12px; }
        .video-error { background: var(--yellow-soft); }
      </style>
      <div class="hands-on-body">${renderedHtml}</div>`;

    const progressService = new ProgressService(
      this.context,
      this.properties.progressListTitle || 'CopilotHandsOnProgress'
    );
    const videoService = new SharePointVideoService(this.context);
    initializeHandsOn(this._shadowRoot, progressService, {
      enableProgress: this.properties.enableProgress !== false,
      displayName: this.context.pageContext.user.displayName,
      videoUrls: {
        drbfm: this.properties.drbfmVideoUrl || DEFAULT_VIDEO_URLS.drbfm,
        pdf: this.properties.pdfVideoUrl || DEFAULT_VIDEO_URLS.pdf,
        // index.html の data-video="inca" と合わせる。プロパティ名は既存ページとの互換性のため維持する。
        inca: this.properties.measurementVideoUrl || DEFAULT_VIDEO_URLS.measurement
      },
      resolveVideoEmbedUrl: (url: string) => videoService.getEmbedUrl(url)
    }).catch(error => console.error('ハンズオンの初期化に失敗しました。', error));
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: 'Graph APIを使わず、SharePointサイト内だけで動作します。' },
          groups: [
            {
              groupName: 'ユーザー別進捗',
              groupFields: [
                PropertyPaneToggle('enableProgress', {
                  label: '進捗を保存する',
                  onText: 'SharePointリストへ本人別に保存',
                  offText: '進捗UIを使用しない'
                }),
                PropertyPaneTextField('progressListTitle', {
                  label: '進捗リスト名',
                  description: '初期値: CopilotHandsOnProgress'
                })
              ]
            },
            {
              groupName: '紹介動画（SharePoint / Stream）',
              groupFields: [
                PropertyPaneTextField('drbfmVideoUrl', {
                  label: 'DRBFM作成紹介',
                  description: 'SharePoint共有URLまたはStream埋め込みコード。未入力時は指定済み動画を表示します。',
                  multiline: true,
                  rows: 3
                }),
                PropertyPaneTextField('pdfVideoUrl', {
                  label: 'PDFテキスト抽出紹介',
                  description: 'SharePoint共有URLまたはStream埋め込みコード。未入力時は指定済み動画を表示します。',
                  multiline: true,
                  rows: 3
                }),
                PropertyPaneTextField('measurementVideoUrl', {
                  label: 'Panel / INCA解析エージェント紹介',
                  description: 'SharePoint共有URLまたはStream埋め込みコード。未入力時は指定済み動画を表示します。',
                  multiline: true,
                  rows: 3
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
