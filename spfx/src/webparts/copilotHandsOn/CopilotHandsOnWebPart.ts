import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import { initializeHandsOn } from './handsOnInteractions';
import { ProgressService } from './ProgressService';
import { siteAssets, siteCss, siteHtml } from './siteContent';

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
      </style>
      <div class="hands-on-body">${renderedHtml}</div>`;

    const progressService = new ProgressService(
      this.context,
      this.properties.progressListTitle || 'CopilotHandsOnProgress'
    );
    initializeHandsOn(this._shadowRoot, progressService, {
      enableProgress: this.properties.enableProgress !== false,
      displayName: this.context.pageContext.user.displayName,
      videoUrls: {
        drbfm: this.properties.drbfmVideoUrl || '',
        pdf: this.properties.pdfVideoUrl || '',
        measurement: this.properties.measurementVideoUrl || ''
      }
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
                  description: '共有URLまたはStreamの埋め込みコードを貼り付けます。',
                  multiline: true,
                  rows: 3
                }),
                PropertyPaneTextField('pdfVideoUrl', {
                  label: 'PDFテキスト抽出紹介',
                  description: '共有URLまたはStreamの埋め込みコードを貼り付けます。',
                  multiline: true,
                  rows: 3
                }),
                PropertyPaneTextField('measurementVideoUrl', {
                  label: 'Panel / INCA解析エージェント紹介',
                  description: '共有URLまたはStreamの埋め込みコードを貼り付けます。',
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
