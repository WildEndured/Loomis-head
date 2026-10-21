// 言語の切り替え（日本語・English・한국어・简体中文・繁體中文）
// HTML は data-i18n="キー"（文字）と data-i18n-attr="属性:キー;属性:キー"（aria-label など）で指す。

const STORE_KEY = 'loomis-head:lang';

export const LANGS = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
  { id: 'ko', label: '한국어' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
];

// 中国語は日本語・韓国語のフォントでは字形が合わない字があるので、選んだときだけ Noto Sans SC / TC を読み込む
const ZH_FONTS = {
  'zh-Hans': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700&display=swap',
  'zh-Hant': 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@500;700&display=swap',
};

const DICT = {
  ja: {
    'page.title': 'ぐるぐるルーミス｜アタリヘッド3D作成ツール',
    'page.desc': '顔のアタリ用のルーミスヘッドをブラウザで回して、自分の下絵に角度を合わせられるツール。PNG と 3D（GLB）で保存できます。',
    'title': 'ぐるぐるルーミス',
    'subtitle': 'アタリヘッド3D作成ツール',
    'hint.drag': 'ドラッグ', 'hint.dragDo': '頭を回す',
    'hint.pan': '右ドラッグ／2本指', 'hint.panDo': '頭を動かす',
    'hint.zoom': 'ホイール／ピンチ', 'hint.zoomDo': '拡大',
    'angles': '角度', 'view.front': '正面', 'view.side': '横', 'view.oblique': '斜め',
    'view.flip': 'もう一度押すと反対向き',
    'drop': 'ここに画像を置く',
    'settings': '設定', 'lang': '言語',
    'undo': 'ひとつ前に戻す', 'resetAll': '初期状態に戻す',
    'sec.presets': 'プリセット', 'sec.shape': '形', 'sec.underlay': '下絵', 'sec.display': '表示', 'sec.save': '保存',
    'note.shape': '番号は画面のガイドの番号です。ダブルクリック（長押し）でその値だけ初期値に戻ります。',
    'underlay.pick': '画像を読み込む', 'underlay.hint': 'ファイル選択・ドラッグ＆ドロップ・Ctrl+V',
    'underlay.remove': '下絵を外す', 'underlay.pasted': '貼り付けた画像',
    'show.sphere': '球を表示', 'show.labels': '番号を表示',
    'save.png': 'PNG保存', 'save.glb': '3D保存（GLB）', 'save.error': '保存できませんでした。もう一度試してください。',
    'preset.standard': '標準', 'preset.youth': '少年・青年', 'preset.girl': '少女', 'preset.child': '子ども',
    'fit.start': '3点で合わせる', 'fit.step0': '目尻を押す（1/3）', 'fit.step1': 'もう片方の目尻（2/3）', 'fit.step2': 'あご先（3/3）',
    'fit.adjust': '点をドラッグで微調整', 'fit.loose': 'ずれが大きいときは近い角度ボタンを押す', 'fit.done': '完了', 'fit.other': '別の向き',
    'about.link': 'このツールについて',
    'about.local.h': 'ブラウザの中だけで動きます',
    'about.local.p': 'このツールはブラウザの中だけで動きます。読み込んだ画像や設定がサーバーに送られることはありません。画像と設定はこの端末のブラウザにだけ保存され、次に開いたときに続きから使えます。',
    'about.use.h': '書き出したデータの利用',
    'about.use.p1': '書き出した PNG・3D データは、商用・非商用を問わず自由に使えます。クレジット表記も不要です。',
    'about.use.p2': 'データそのものの再配布もかまいませんが、販売（有料素材として配るなど）はしないでください。',
    'about.disclaimer.h': '免責事項',
    'about.disclaimer.p': 'このツールはルーミス法をもとにしたアタリの目安で、正確な人体の形を保証するものではありません。このツールや書き出したデータの利用によって生じたいかなる損害についても、作者は責任を負いません。内容は予告なく変更・公開終了することがあります。',
    'about.contact.h': 'お問い合わせ',
    'about.contact.p': 'ご意見・不具合の連絡は X へ：',
    'about.credits.h': '使用しているもの',
    'about.credits.p': '3D: three.js（MIT License）／フォント: Mochiy Pop One, Zen Maru Gothic, Jua, Noto Sans SC/TC（SIL Open Font License）',
    'about.close': '閉じる',
    'group.head': '頭（球）', 'group.face': '顔の線', 'group.jaw': '顎ライン', 'group.chin': 'あご先',
    'param.cut': '頭の幅', 'param.top': 'てっぺんの高さ', 'param.back': '後頭部の出っ張り',
    'param.r0': '③ 側面の円の大きさ', 'param.eye': '② 眉・目の線の高さ', 'param.forehead': '④ 生え際の高さ',
    'param.jaw_start': 'Ⓐ 顎ラインの起点', 'param.jaw_len': '⑦ 顎ライン Ⓐ→Ⓑの長さ', 'param.jaw_tilt': '⑦ 顎ライン Ⓐ→Ⓑの傾き',
    'param.jaw_x': 'Ⓑ エラの幅', 'param.chin_len': 'Ⓒ あご先の高さ', 'param.chin_front': 'Ⓒ あご先の前後',
    'param.chin_w': 'Ⓒ あご先の幅', 'param.chin_round': 'Ⓒ あご先の丸み',
    'param.line': '線の太さ', 'param.scale': '大きさ', 'param.rot': '回転', 'param.transp': '透明度',
  },
  en: {
    'page.title': 'Guruguru Loomis | 3D head guide for drawing faces',
    'page.desc': 'Rotate a Loomis head in your browser and match it to the angle of your own sketch. Save as PNG or 3D (GLB).',
    'title': 'Guruguru Loomis',
    'subtitle': '3D head guide for drawing faces',
    'hint.drag': 'Drag', 'hint.dragDo': 'Rotate head',
    'hint.pan': 'Right-drag / 2 fingers', 'hint.panDo': 'Move head',
    'hint.zoom': 'Wheel / pinch', 'hint.zoomDo': 'Zoom',
    'angles': 'View', 'view.front': 'Front', 'view.side': 'Side', 'view.oblique': '3/4',
    'view.flip': 'Press again to flip',
    'drop': 'Drop image here',
    'settings': 'Settings', 'lang': 'Language',
    'undo': 'Undo', 'resetAll': 'Reset all',
    'sec.presets': 'Presets', 'sec.shape': 'Shape', 'sec.underlay': 'Reference', 'sec.display': 'Display', 'sec.save': 'Save',
    'note.shape': 'The numbers match the guide numbers on the head. Double-click (or long-press) a slider to reset just that value.',
    'underlay.pick': 'Load image', 'underlay.hint': 'File, drag & drop, or Ctrl+V',
    'underlay.remove': 'Remove reference', 'underlay.pasted': 'Pasted image',
    'show.sphere': 'Show ball', 'show.labels': 'Show numbers',
    'save.png': 'Save PNG', 'save.glb': 'Save 3D (GLB)', 'save.error': "Couldn't save. Please try again.",
    'preset.standard': 'Standard', 'preset.youth': 'Boy / young man', 'preset.girl': 'Girl', 'preset.child': 'Child',
    'fit.start': 'Fit 3 points', 'fit.step0': 'Mark an outer eye corner (1/3)', 'fit.step1': 'The other eye corner (2/3)', 'fit.step2': 'The chin (3/3)',
    'fit.adjust': 'Drag the points to fine-tune', 'fit.loose': 'Still off? Press the closest view button', 'fit.done': 'Done', 'fit.other': 'Other angle',
    'about.link': 'About this tool',
    'about.local.h': 'Everything stays in your browser',
    'about.local.p': 'This tool runs entirely in your browser. Images you load and your settings are never sent to a server. Images and settings are saved only in this browser, so you can pick up where you left off next time.',
    'about.use.h': 'Using what you export',
    'about.use.p1': 'You may use exported PNG and 3D files freely, including in commercial work. No credit is required.',
    'about.use.p2': 'You may also redistribute the files themselves, but please do not sell them (for example, as paid assets).',
    'about.disclaimer.h': 'Disclaimer',
    'about.disclaimer.p': 'This tool provides guide shapes based on the Loomis method and does not guarantee accurate anatomy. The author accepts no responsibility for any damage arising from the use of this tool or of exported data. The tool may change or be discontinued without notice.',
    'about.contact.h': 'Contact',
    'about.contact.p': 'Feedback and bug reports on X:',
    'about.credits.h': 'Credits',
    'about.credits.p': '3D: three.js (MIT License) / Fonts: Mochiy Pop One, Zen Maru Gothic, Jua, Noto Sans SC/TC (SIL Open Font License)',
    'about.close': 'Close',
    'group.head': 'Head (ball)', 'group.face': 'Face lines', 'group.jaw': 'Jawline', 'group.chin': 'Chin',
    'param.cut': 'Head width', 'param.top': 'Top of head', 'param.back': 'Back of head',
    'param.r0': '③ Side circle size', 'param.eye': '② Brow / eye line height', 'param.forehead': '④ Hairline height',
    'param.jaw_start': 'Ⓐ Jawline start', 'param.jaw_len': '⑦ Jawline Ⓐ→Ⓑ length', 'param.jaw_tilt': '⑦ Jawline Ⓐ→Ⓑ angle',
    'param.jaw_x': 'Ⓑ Jaw corner width', 'param.chin_len': 'Ⓒ Chin height', 'param.chin_front': 'Ⓒ Chin forward / back',
    'param.chin_w': 'Ⓒ Chin width', 'param.chin_round': 'Ⓒ Chin roundness',
    'param.line': 'Line width', 'param.scale': 'Size', 'param.rot': 'Rotation', 'param.transp': 'Transparency',
  },
  ko: {
    'page.title': '빙글빙글 루미스 | 얼굴 밑그림용 3D 헤드 도구',
    'page.desc': '브라우저에서 루미스 헤드를 돌려 내 그림의 각도에 맞출 수 있는 도구. PNG와 3D(GLB)로 저장할 수 있습니다.',
    'title': '빙글빙글 루미스',
    'subtitle': '얼굴 밑그림용 3D 헤드 도구',
    'hint.drag': '드래그', 'hint.dragDo': '머리 돌리기',
    'hint.pan': '오른쪽 드래그／두 손가락', 'hint.panDo': '머리 옮기기',
    'hint.zoom': '휠／핀치', 'hint.zoomDo': '확대',
    'angles': '각도', 'view.front': '정면', 'view.side': '측면', 'view.oblique': '3/4',
    'view.flip': '한 번 더 누르면 반대 방향',
    'drop': '여기에 이미지를 놓으세요',
    'settings': '설정', 'lang': '언어',
    'undo': '되돌리기', 'resetAll': '처음으로',
    'sec.presets': '프리셋', 'sec.shape': '형태', 'sec.underlay': '밑그림', 'sec.display': '표시', 'sec.save': '저장',
    'note.shape': '번호는 화면 가이드의 번호입니다. 더블클릭(길게 누르기)하면 그 값만 처음 값으로 돌아갑니다.',
    'underlay.pick': '이미지 불러오기', 'underlay.hint': '파일 선택·드래그 앤 드롭·Ctrl+V',
    'underlay.remove': '밑그림 지우기', 'underlay.pasted': '붙여넣은 이미지',
    'show.sphere': '구 표시', 'show.labels': '번호 표시',
    'save.png': 'PNG 저장', 'save.glb': '3D 저장 (GLB)', 'save.error': '저장하지 못했습니다. 다시 시도해 주세요.',
    'preset.standard': '표준', 'preset.youth': '소년·청년', 'preset.girl': '소녀', 'preset.child': '어린이',
    'fit.start': '3점 맞추기', 'fit.step0': '눈꼬리를 찍기 (1/3)', 'fit.step1': '다른 쪽 눈꼬리 (2/3)', 'fit.step2': '턱끝 (3/3)',
    'fit.adjust': '점을 드래그해 미세 조정', 'fit.loose': '많이 어긋나면 가까운 각도 버튼을 누르기', 'fit.done': '완료', 'fit.other': '다른 방향',
    'about.link': '이 도구에 대하여',
    'about.local.h': '브라우저 안에서만 동작합니다',
    'about.local.p': '이 도구는 브라우저 안에서만 동작합니다. 불러온 이미지와 설정은 서버로 전송되지 않습니다. 이미지와 설정은 이 브라우저에만 저장되어, 다음에 열 때 이어서 사용할 수 있습니다.',
    'about.use.h': '내보낸 데이터 이용',
    'about.use.p1': '내보낸 PNG와 3D 데이터는 상업적 이용을 포함해 자유롭게 사용할 수 있습니다. 출처 표기도 필요 없습니다.',
    'about.use.p2': '데이터 자체를 재배포해도 되지만, 판매(유료 소재로 배포하는 등)는 하지 마세요.',
    'about.disclaimer.h': '면책 사항',
    'about.disclaimer.p': '이 도구는 루미스 기법을 바탕으로 한 밑그림용 기준이며, 정확한 인체 형태를 보장하지 않습니다. 이 도구 및 내보낸 데이터의 이용으로 생긴 어떠한 손해에 대해서도 제작자는 책임지지 않습니다. 내용은 예고 없이 변경되거나 공개가 종료될 수 있습니다.',
    'about.contact.h': '문의',
    'about.contact.p': '의견이나 버그 제보는 X로:',
    'about.credits.h': '사용한 것',
    'about.credits.p': '3D: three.js (MIT License) / 폰트: Mochiy Pop One, Zen Maru Gothic, Jua, Noto Sans SC/TC (SIL Open Font License)',
    'about.close': '닫기',
    'group.head': '머리(구)', 'group.face': '얼굴 선', 'group.jaw': '턱선', 'group.chin': '턱끝',
    'param.cut': '머리 폭', 'param.top': '정수리 높이', 'param.back': '뒤통수 돌출',
    'param.r0': '③ 옆면 원 크기', 'param.eye': '② 눈썹·눈 선 높이', 'param.forehead': '④ 헤어라인 높이',
    'param.jaw_start': 'Ⓐ 턱선 시작점', 'param.jaw_len': '⑦ 턱선 Ⓐ→Ⓑ 길이', 'param.jaw_tilt': '⑦ 턱선 Ⓐ→Ⓑ 기울기',
    'param.jaw_x': 'Ⓑ 턱 모서리 폭', 'param.chin_len': 'Ⓒ 턱끝 높이', 'param.chin_front': 'Ⓒ 턱끝 앞뒤',
    'param.chin_w': 'Ⓒ 턱끝 폭', 'param.chin_round': 'Ⓒ 턱끝 둥글기',
    'param.line': '선 굵기', 'param.scale': '크기', 'param.rot': '회전', 'param.transp': '투명도',
  },
  'zh-Hans': {
    'page.title': '转转路米斯｜画脸用的3D头部辅助工具',
    'page.desc': '在浏览器里旋转路米斯头部模型，对准你自己草稿的角度。可保存为 PNG 和 3D（GLB）。',
    'title': '转转路米斯',
    'subtitle': '画脸用的3D头部辅助工具',
    'hint.drag': '拖动', 'hint.dragDo': '旋转头部',
    'hint.pan': '右键拖动／双指', 'hint.panDo': '移动头部',
    'hint.zoom': '滚轮／双指缩放', 'hint.zoomDo': '缩放',
    'angles': '角度', 'view.front': '正面', 'view.side': '侧面', 'view.oblique': '3/4侧',
    'view.flip': '再按一次换成反方向',
    'drop': '把图片放到这里',
    'settings': '设置', 'lang': '语言',
    'undo': '撤销', 'resetAll': '全部重置',
    'sec.presets': '预设', 'sec.shape': '形状', 'sec.underlay': '底稿', 'sec.display': '显示', 'sec.save': '保存',
    'note.shape': '编号与画面上辅助线的编号对应。双击（长按）滑块，只把这一项恢复为初始值。',
    'underlay.pick': '载入图片', 'underlay.hint': '选择文件／拖放／Ctrl+V',
    'underlay.remove': '移除底稿', 'underlay.pasted': '粘贴的图片',
    'show.sphere': '显示球体', 'show.labels': '显示编号',
    'save.png': '保存PNG', 'save.glb': '保存3D（GLB）', 'save.error': '保存失败，请再试一次。',
    'preset.standard': '标准', 'preset.youth': '少年／青年', 'preset.girl': '少女', 'preset.child': '儿童',
    'fit.start': '三点对齐', 'fit.step0': '点击外眼角（1/3）', 'fit.step1': '另一侧外眼角（2/3）', 'fit.step2': '下巴尖（3/3）',
    'fit.adjust': '拖动点来微调', 'fit.loose': '偏差较大时，请按最接近的角度按钮', 'fit.done': '完成', 'fit.other': '另一个朝向',
    'about.link': '关于本工具',
    'about.local.h': '只在浏览器中运行',
    'about.local.p': '本工具只在浏览器中运行。载入的图片和设置不会发送到服务器。图片和设置只保存在这台设备的浏览器中，下次打开时可以接着使用。',
    'about.use.h': '导出数据的使用',
    'about.use.p1': '导出的 PNG 和 3D 数据可自由使用，包括商业用途，也无需署名。',
    'about.use.p2': '可以再分发数据本身，但请勿出售（例如作为付费素材发布）。',
    'about.disclaimer.h': '免责声明',
    'about.disclaimer.p': '本工具是基于路米斯画法的草稿辅助参考，不保证人体形状的准确性。对于因使用本工具或导出数据而产生的任何损失，作者概不负责。内容可能在不事先通知的情况下变更或停止公开。',
    'about.contact.h': '联系方式',
    'about.contact.p': '意见与问题反馈请通过 X：',
    'about.credits.h': '使用的资源',
    'about.credits.p': '3D：three.js（MIT License）／字体：Mochiy Pop One、Zen Maru Gothic、Jua、Noto Sans SC/TC（SIL Open Font License）',
    'about.close': '关闭',
    'group.head': '头部（球）', 'group.face': '面部线', 'group.jaw': '下颌线', 'group.chin': '下巴尖',
    'param.cut': '头部宽度', 'param.top': '头顶高度', 'param.back': '后脑勺突出',
    'param.r0': '③ 侧面圆的大小', 'param.eye': '② 眉眼横线的高度', 'param.forehead': '④ 发际线高度',
    'param.jaw_start': 'Ⓐ 下颌线起点', 'param.jaw_len': '⑦ 下颌线 Ⓐ→Ⓑ 长度', 'param.jaw_tilt': '⑦ 下颌线 Ⓐ→Ⓑ 倾斜',
    'param.jaw_x': 'Ⓑ 下颌角宽度', 'param.chin_len': 'Ⓒ 下巴尖高度', 'param.chin_front': 'Ⓒ 下巴尖前后',
    'param.chin_w': 'Ⓒ 下巴尖宽度', 'param.chin_round': 'Ⓒ 下巴尖圆润度',
    'param.line': '线条粗细', 'param.scale': '大小', 'param.rot': '旋转', 'param.transp': '透明度',
  },
  'zh-Hant': {
    'page.title': '轉轉路米斯｜畫臉用的3D頭部輔助工具',
    'page.desc': '在瀏覽器裡旋轉路米斯頭部模型，對準你自己草稿的角度。可儲存為 PNG 和 3D（GLB）。',
    'title': '轉轉路米斯',
    'subtitle': '畫臉用的3D頭部輔助工具',
    'hint.drag': '拖曳', 'hint.dragDo': '旋轉頭部',
    'hint.pan': '右鍵拖曳／雙指', 'hint.panDo': '移動頭部',
    'hint.zoom': '滾輪／雙指縮放', 'hint.zoomDo': '縮放',
    'angles': '角度', 'view.front': '正面', 'view.side': '側面', 'view.oblique': '3/4側',
    'view.flip': '再按一次換成反方向',
    'drop': '把圖片放到這裡',
    'settings': '設定', 'lang': '語言',
    'undo': '復原', 'resetAll': '全部重設',
    'sec.presets': '預設', 'sec.shape': '形狀', 'sec.underlay': '底稿', 'sec.display': '顯示', 'sec.save': '儲存',
    'note.shape': '編號與畫面上輔助線的編號對應。雙擊（長按）滑桿，只把這一項恢復為初始值。',
    'underlay.pick': '載入圖片', 'underlay.hint': '選擇檔案／拖放／Ctrl+V',
    'underlay.remove': '移除底稿', 'underlay.pasted': '貼上的圖片',
    'show.sphere': '顯示球體', 'show.labels': '顯示編號',
    'save.png': '儲存PNG', 'save.glb': '儲存3D（GLB）', 'save.error': '儲存失敗，請再試一次。',
    'preset.standard': '標準', 'preset.youth': '少年／青年', 'preset.girl': '少女', 'preset.child': '兒童',
    'fit.start': '三點對齊', 'fit.step0': '點選外眼角（1/3）', 'fit.step1': '另一側外眼角（2/3）', 'fit.step2': '下巴尖（3/3）',
    'fit.adjust': '拖曳點來微調', 'fit.loose': '偏差較大時，請按最接近的角度按鈕', 'fit.done': '完成', 'fit.other': '另一個朝向',
    'about.link': '關於本工具',
    'about.local.h': '只在瀏覽器中運作',
    'about.local.p': '本工具只在瀏覽器中運作。載入的圖片和設定不會傳送到伺服器。圖片和設定只儲存在這台裝置的瀏覽器中，下次開啟時可以接著使用。',
    'about.use.h': '匯出資料的使用',
    'about.use.p1': '匯出的 PNG 和 3D 資料可自由使用，包括商業用途，也不需標示出處。',
    'about.use.p2': '可以再散布資料本身，但請勿販售（例如作為付費素材發布）。',
    'about.disclaimer.h': '免責聲明',
    'about.disclaimer.p': '本工具是基於路米斯畫法的草稿輔助參考，不保證人體形狀的準確性。對於因使用本工具或匯出資料而產生的任何損失，作者概不負責。內容可能在未事先通知的情況下變更或停止公開。',
    'about.contact.h': '聯絡方式',
    'about.contact.p': '意見與問題回報請透過 X：',
    'about.credits.h': '使用的資源',
    'about.credits.p': '3D：three.js（MIT License）／字型：Mochiy Pop One、Zen Maru Gothic、Jua、Noto Sans SC/TC（SIL Open Font License）',
    'about.close': '關閉',
    'group.head': '頭部（球）', 'group.face': '臉部線', 'group.jaw': '下顎線', 'group.chin': '下巴尖',
    'param.cut': '頭部寬度', 'param.top': '頭頂高度', 'param.back': '後腦勺突出',
    'param.r0': '③ 側面圓的大小', 'param.eye': '② 眉眼橫線的高度', 'param.forehead': '④ 髮際線高度',
    'param.jaw_start': 'Ⓐ 下顎線起點', 'param.jaw_len': '⑦ 下顎線 Ⓐ→Ⓑ 長度', 'param.jaw_tilt': '⑦ 下顎線 Ⓐ→Ⓑ 傾斜',
    'param.jaw_x': 'Ⓑ 下顎角寬度', 'param.chin_len': 'Ⓒ 下巴尖高度', 'param.chin_front': 'Ⓒ 下巴尖前後',
    'param.chin_w': 'Ⓒ 下巴尖寬度', 'param.chin_round': 'Ⓒ 下巴尖圓潤度',
    'param.line': '線條粗細', 'param.scale': '大小', 'param.rot': '旋轉', 'param.transp': '透明度',
  },
};

let lang = 'ja';

export const t = (key) => DICT[lang][key] ?? DICT.ja[key] ?? key;
export const getLang = () => lang;

// 保存した言語 → 端末の言語（韓国語・英語・中国語なら合わせる。zh-TW/HK/MO と Hant は繁体字）→ 日本語
export function initialLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (DICT[saved]) return saved;
  } catch { /* 読めなくてよい */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const tag = String(l).toLowerCase();
    const base = tag.split('-')[0];
    if (base === 'ja' || base === 'ko' || base === 'en') return base;
    if (base === 'zh') return /hant|-tw|-hk|-mo/.test(tag) ? 'zh-Hant' : 'zh-Hans';
  }
  return 'ja';
}

export function setLang(next, root = document) {
  lang = DICT[next] ? next : 'ja';
  try { localStorage.setItem(STORE_KEY, lang); } catch { /* 保存できなくてよい */ }
  document.documentElement.lang = lang;
  if (ZH_FONTS[lang] && !document.querySelector(`link[data-font="${lang}"]`)) {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: ZH_FONTS[lang] });
    link.dataset.font = lang;
    document.head.appendChild(link);
  }
  document.title = t('page.title');
  root.querySelector('meta[name="description"]')?.setAttribute('content', t('page.desc'));
  applyI18n(root);
}

export function applyI18n(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  }
}
