# 简介

整个项目由三部分组成

*   cocos：负责使用者与地图上曲线、关卡、宝箱的互操作
*   vue：负责与native-api互相调用的部分
*   tauri：负责打包成.app

# 环境准备

*   任意版本node
*   导出ccb功能会调用`python2 TripeaksResources/importMapPoint2.py`脚本，要求python2和这个脚本都存在。

# 如何开发

1.  运行`npm install`
2.  运行：`npm run tauri dev`
3.  打包：`npm run tauri build`
    1.  打包结果会放在src-tauri/target/release目录下

# 如何运行

1.  美术具体如何操作都写在游戏内部的帮助界面了

2.  等美术把地图点都铺到ccb以后，程序在客户端使用`./run.py importMapInfo `命令把地图点同步到客户端。

