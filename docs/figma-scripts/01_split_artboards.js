// Figma Plugin API script（use_figma / Scripter 等で実行）
// 目的: ルートGroup 2:3 の3レイヤー（BACK画像 / BACKカラー / DESIGN）の直下要素を
//       アートボード単位のフレームへ移動する。絶対座標は維持する。
// 前提: バックアップページ 4:2「Backup 2026-09-07」作成済み。
// アートボード原点は PDF の余白と Figma の描画境界の照合から決定（2026-09-07）。
//
// 実行済み（2026-09-07）: PC 4面 → フレーム 14:2 / 14:6 / 14:10 / 14:14、
//                        SP 5面 → フレーム 18:2 / 18:6 / 18:9 / 18:13 / 18:17
//   結果と検証は docs/figma-artboards.md を参照。
//
// 注意（実行時に判明）:
//  - figma.group() でレイヤーの全子要素をまとめると、空になった親グループは即時に自動削除される。
//    その後に layer.name を参照すると "node does not exist" で落ちるため、名前は事前に控える。
//  - use_figma はスクリプトが途中で例外を出すと、その呼び出し内の変更をすべてロールバックする。
//  - 1回の呼び出しで 4〜5 面ずつに分けて実行した。
const root = await figma.getNodeByIdAsync("2:3");
const page = figma.currentPage;
const boards = [
 {name:"PC-Menu", x:-7481, y:-5277, w:1920, h:1000},
 {name:"PC-1",    x:-5321, y:-5277, w:1920, h:8826},
 {name:"PC-2",    x:-3182, y:-5277, w:1920, h:8635},
 {name:"PC-3",    x:-1010, y:-5277, w:1920, h:10107},
 {name:"SP-Menu", x: 1633, y:-5282, w:750,  h:1400},
 {name:"SP-1",    x: 2665, y:-5282, w:750,  h:9377},
 {name:"SP-2",    x: 3735, y:-5282, w:750,  h:9353},
 {name:"SP-3",    x: 4811, y:-5282, w:750,  h:8557},
 {name:"SP-4",    x: 5881, y:-5282, w:750,  h:6018},
];
const layerIds = root.children.map(l => l.id);
const layerNames = {}; for (const l of root.children) layerNames[l.id] = l.name;
const result = {createdNodeIds:[], mutatedNodeIds:[], boards:[]};
for (const bd of boards) {
  if (page.children.find(n => n.type==="FRAME" && n.name===bd.name)) { result.boards.push({name:bd.name, skipped:true}); continue; }
  const frame = figma.createFrame();
  frame.name = bd.name; frame.resize(bd.w, bd.h); frame.x = bd.x; frame.y = bd.y;
  frame.clipsContent = true; frame.fills = [{type:"SOLID", color:{r:1,g:1,b:1}}];
  page.appendChild(frame);
  result.createdNodeIds.push(frame.id);
  const info = {name:bd.name, frameId:frame.id, groups:[]};
  for (const lid of layerIds) {
    const layer = await figma.getNodeByIdAsync(lid);
    if (!layer || layer.removed) continue;           // 空になって自動削除されたレイヤー
    const lname = layerNames[lid];
    // 要素の水平中心がアートボード範囲（±80px）に入るものを拾う
    const picked = layer.children.filter(ch => { const b=ch.absoluteBoundingBox; if(!b) return false; const cx=b.x+b.width/2; return cx>=bd.x-80 && cx<=bd.x+bd.w+80; });
    if (!picked.length) continue;
    const g = figma.group(picked, layer);           // bottom -> top の順を維持
    g.name = lname;
    const ax = g.absoluteTransform[0][2], ay = g.absoluteTransform[1][2];
    frame.appendChild(g);
    g.x = ax - frame.x; g.y = ay - frame.y;         // 絶対座標を維持
    result.mutatedNodeIds.push(g.id);
    info.groups.push({layer:lname, groupId:g.id, count:picked.length});
  }
  result.boards.push(info);
}
result.remaining = [];
for (const lid of layerIds) { const l = await figma.getNodeByIdAsync(lid); result.remaining.push(l && !l.removed ? {id:lid,name:layerNames[lid],count:l.children.length} : {id:lid,name:layerNames[lid],removed:true}); }
return result;
