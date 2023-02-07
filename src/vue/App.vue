<script setup>
import { ref, onMounted } from 'vue'
import {fs} from "@tauri-apps/api"
import { Command } from '@tauri-apps/api/shell'

const pageIndex = ref(0); //选择的是哪个标签页
const chapterNum = ref(0); //要加载哪一章地图

const errIndexes = ref([1]); //当前是否有错误

async function onChangeChapter(){
  let doc = {chapterNum:chapterNum.value};
  cc.eventManager.dispatchCustomEvent("onChangeChapter", doc);
}

async function onExportCCBDoc(){
  let git_root = window.localStorage.getItem("git_root");

  let param = {};
  cc.eventManager.dispatchCustomEvent("onExportCCBDoc", param);

  console.log(param.doc.chapterNum, chapterNum.value);
  if (param.doc.chapterNum != chapterNum.value) {
    alert("当前章节不一致");
    return;
  }

  // console.log(JSON.stringify(param.doc));

  let entries = JSON.stringify(param.doc.entries);
  let chests = JSON.stringify(param.doc.chests);

  let args = [
    `${git_root}/importMapPoint2.py`,
    `--WorldNum`,
    `${chapterNum.value}`,
    `--entries`,
    `${entries}`,
    `--chests`,
    `${chests}`,
  ];
  
  let cmd = new Command('save-doc-ccb', args, {cwd:git_root});
  let output = await cmd.execute();
  if (output.code || output.stderr) {
    alert(`code=${output.code}:${output.stderr}`);
    return;
  }

  alert("导出成功");
}

async function onSetResourceRoot(){
  const selected = await window.__TAURI__.dialog.open({
    directory: true,
  });

  if (!selected)
    return;

  window.localStorage.setItem("git_root", selected);
  
  checkAppCanStart();
}

function onClearStorage(){
  window.localStorage.clear();
  checkAppCanStart();
}

async function checkAppCanStart(){
  let errIds = [];

  let git_root = window.localStorage.getItem("git_root");

  if (!git_root || !await fs.exists(git_root)) {
    errIds.push(1);
  }

  let exists = await fs.exists(`${git_root}/ResourcesTripeasks_B/Resources`);
  if (!exists) {
    errIds.push(1);
  }

  exists = await fs.exists(`${git_root}/importMapPoint2.py`);
  if (!exists) {
    errIds.push(2);
  }

  if (errIds.length==0) {
    for(let i=100; i>0; --i)
    {
      let d = `${git_root}/ResourcesTripeasks_B/Resources/world_${i}_opt`;
      let exists = await fs.exists(d);
      if (exists) {
        chapterNum.value = i;
        break;
      }
    }
  }

  errIndexes.value = Array.from(new Set(errIds))
}

async function onLoadDoc() {
  const selected = await window.__TAURI__.dialog.open({
    filters: [{name:"*.json",extensions:['json']}]
  });

  if (!selected)
    return;

  let content = await fs.readTextFile(selected);

  let param = {};
  param.doc = JSON.parse(content);
  cc.eventManager.dispatchCustomEvent("onLoadDoc", param);
  chapterNum.value = param.doc.chapterNum;

  alert("加载成功");
}

async function onSaveDoc() {
  let param = {};
  cc.eventManager.dispatchCustomEvent("onSaveDoc", param);
  if (param.doc.chapterNum != chapterNum.value) {
    alert("当前章节不一致");
    return;
  }

  const selected = await window.__TAURI__.dialog.save({
    defaultPath:`level${chapterNum.value}.json`,
    filters: [{name:"*.json",extensions:['json']}]
  });
  if (!selected)
    return;

  let content = JSON.stringify(param.doc, null, 4);
  await fs.writeTextFile(selected, content);

  alert("保存成功");
}

function main(){
  checkAppCanStart();
}
main();

</script>

<template>
  <div>
    <button @click="pageIndex=0">操作界面</button>
    <button @click="pageIndex=1">帮助界面</button>
  </div>

  <hr/>

  <div v-if="pageIndex==0">
    <hr/>

    <div v-if="errIndexes.length==0">
      <div>
        跳转到章节：<input type="number" v-model="chapterNum"/>
        <button @click="onChangeChapter">跳转</button>
      </div>

      <hr/>
        <button @click="onLoadDoc">加载曲线</button>
        <button @click="onSaveDoc">保存曲线</button>
        <button @click="onClearStorage">清空storage</button>
      <div>

      </div>
      <hr/>

      <div>
        <button @click="onExportCCBDoc">导出到ccb</button>
      </div>
    </div>
    <div v-else>

      <p>以下错误待解决：</p>
      <div v-for="errId in errIndexes">
        <div v-if="errId==1">
          未设置资源git目录：<button @click="onSetResourceRoot">未设置资源git目录</button>
        </div>
        <div v-if="errId==2">
          找不到importMapPoint2.py：<button @click="onSetResourceRoot">重新设置资源git目录</button>
        </div>
      </div>

    </div>


  </div>

  <div v-if="pageIndex==1">
    <h2>如何使用编辑器</h2>
    <ol>
      <li>把地图png、ccb资源都上传到新章节目录。</li>
      <li>跳转到某一章节，每3屏建1条曲线，一共4条曲线</li>
      <li>使用<b>鼠标右键-300关切割</b>功能，分割曲线</li>
      <li>点击<b>导出到ccb</b>就可以了</li>
    </ol>

    <h2>功能说明</h2>
    <ul>
      <li>在曲线上增加一个控制点：d</li>
      <li>在曲线上减少一个控制点：delete</li>
      <li>改变宝箱/关卡点状态：tab</li>
      <li>增加/减少关卡点数量：键盘-+或鼠标滚轮</li>
      <li>鼠标右键：调出菜单</li>
      <li>300关切割：会把300关的曲线，以每25关+1宝箱切开</li>
    </ul>

    <h2>其他说明</h2>
    <ul>
      <li>这个编辑器只能创建新的关卡节点布局，不能修改老的。也就是有新章节的时候，应该用这个编辑器从头开始创建关卡节点，而一旦创建了以后，如果想要修改，就要去ccb里调节。</li>
      <li>这个编辑器的定位不是一个通用编辑器，所以缺少某些功能。如果遵守使用规范，创建一个关卡会很容易，如果不遵守使用规范，有些功能会无法完成。</li>
      <li>不能编辑带挑战关的章节</li>
    </ul>

  </div>

</template>

