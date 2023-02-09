<script setup>
import { ref, onMounted } from 'vue'
import {fs} from "@tauri-apps/api"
import { Command } from '@tauri-apps/api/shell'

const pageIndex = ref(0); //选择的是哪个标签页
const chapterNum = ref(0); //要加载哪一章地图

const errLogs = ref([]); //当前是否有错误 [{type:1, msg:"xxx"}]

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
  
  let succeed = false;
  let errMsg = "";
  for(let i=1; i<=2; ++i)
  {
    try
    {
      let cmd = new Command(`python2-${i}`, args, {cwd:git_root});
      let output = await cmd.execute();
      if (output.code==0 && !output.stderr)
      {
        succeed = true;
        break;
      }
      else
      {
        errMsg += `code=${output.code}:${output.stderr}\n`;
      }
    }
    catch(ex)
    {
      errMsg += ex+"\n";
    }
  }
  if (succeed) {
    alert("导出成功");
  }
  else{
    alert(errMsg);
  }  
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

async function checkResourceGitRoot(){
  let tmp_errLogs = [];

  let git_root = window.localStorage.getItem("git_root") || "";

  if (!await fs.exists(git_root)) {
    tmp_errLogs.push({type:1, msg:"找不到TripeaksResources目录"});
  }

  let exists = await fs.exists(`${git_root}/ResourcesTripeasks_B/Resources`);
  if (!exists) {
    tmp_errLogs.push({type:1, msg:"找不到ResourcesTripeasks_B/Resources目录"});
  }

  exists = await fs.exists(`${git_root}/importMapPoint2.py`);
  if (!exists) {
    tmp_errLogs.push({type:1, msg:`找不到${git_root}/importMapPoint2.py`});
  }

  return tmp_errLogs;
}

async function checkPython2()
{
  let tmp_errLogs = [];

  let cmd = new Command('where');
  let output = await cmd.execute();
  if (output.code!=0) {
    tmp_errLogs.push({type:2, msg:output.stdout});
  }
  else {
    let lines = output.stdout.split();
    console.log(lines);
  }

  return tmp_errLogs;
}

async function checkAppCanStart(){
  let tmp_errLogs = [];
  tmp_errLogs = tmp_errLogs.concat(await checkResourceGitRoot());
  // tmp_errLogs.concat(await checkPython2());

  if (tmp_errLogs.length==0)
  {
    let git_root = window.localStorage.getItem("git_root") || "";

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

  console.log(tmp_errLogs);

  errLogs.value = [];
  for(let i in tmp_errLogs)
  {
    if (!errLogs.value.find((x)=>x.type==tmp_errLogs[i].type)) {
      errLogs.value.push(tmp_errLogs[i]);
    }
  }
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

function safe(fun)
{
  try
  {
    fun();
  }
  catch(ex)
  {
    alert(ex);
  }
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

    <div v-if="errLogs.length==0">
      <div>
        跳转到章节：<input type="number" v-model="chapterNum"/>
        <button @click="safe(onChangeChapter)">跳转</button>
      </div>

      <hr/>
        <button @click="safe(onLoadDoc)">加载曲线</button>
        <button @click="safe(onSaveDoc)">保存曲线</button>
        <button @click="safe(onClearStorage)">清空storage</button>
      <div>

      </div>
      <hr/>

      <div>
        <button @click="safe(onExportCCBDoc)">导出到ccb</button>
      </div>
    </div>
    <div v-else>

      <p>以下错误待解决：</p>
      <div v-for="errLog in errLogs">
        <div v-if="errLog.type==1">
          {{errLog.msg}}<button @click="onSetResourceRoot">设置资源git目录</button>
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

