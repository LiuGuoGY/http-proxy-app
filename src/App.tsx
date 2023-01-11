import React, { Component, useEffect, useState } from 'react';
import styles from 'styles/app.module.scss';
const { app, clipboard } = require('@electron/remote')
import axios from 'axios';
import { List, Tag, Button, message, Tooltip, Progress, Checkbox, Modal } from "antd";
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ReloadOutlined, CheckOutlined, BugOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons';
const osProxy = require('cross-os-proxy');
const regedit = require('regedit');

let scanTimes: number = 0;

//使用nodejs环境
axios.defaults.adapter = require('axios/lib/adapters/http');
message.config({
  top: 480,
  duration: 2,
  maxCount: 1,
});
regedit.setExternalVBSLocation('resources/regedit/vbs');

interface DataType {
  idx: number;      //唯一序号
  ip: string;
  state: string;
  stateColor: string;
  port: string;
  conTimes: number;  //连通次数
  conRate: number;    //连通率 百分制
  select: boolean,
}

const App: React.FC = () => {
  const [ipData, setIpData] = useState<DataType[]>([]);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);
  const [scanLoading, setScanLoading] = useState<boolean>(false);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);
  const [listen, setListen] = useState<boolean>(false);
  const [sysProxy, setSysProxy] = useState<boolean>(false);
  const [proxyLoading, setProxyLoading] = useState<boolean>(false);
  const [timer, setTimer] = useState<NodeJS.Timer>();


  //返回xxx.xxx.xxx.xxx:pppp的字符串数组
  async function requestProxyip() {
    try {
      const response = await axios({
        url: `https://api.proxyip.info/api.php?key=6666&method=all`,
        method: 'get',
        timeout: 5000,
      });
      console.log(response);
      let data = response.data.split("\r\n");
      if (data[0] === "Times used up") {
        data = [];
      } else {
        data.pop();
      }
      return data;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  async function requestGithubip() {
    try {
      const response = await axios({
        url: "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        method: 'get',
        timeout: 5000,
        // proxy: {
        //   host: "127.0.0.1",
        //   port: 7890
        // }
      });
      console.log(response);
      let data = response.data.split("\n");
      data.pop();
      return data;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  async function requestBoySaveProxyList() {
    try {
      const response = await axios({
        url: `http://proxy.boysave.com/all/`,
        method: 'get',
        timeout: 5000,
      });
      console.log(response);
      let json = response.data;
      let data = []
      for (let i = 0; i < json.length; i++) {
        data.push(json[i].proxy);
      }
      return data;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  async function getData() {
    let promiseArray = [];
    let data: Array<string> = [];
    // promiseArray.push(requestProxyip());
    promiseArray.push(requestGithubip());
    // promiseArray.push(requestBoySaveProxyList());
    let resArr = await Promise.all(promiseArray);
    for (let i = 0; i < resArr.length; i++) {
      data = data.concat(resArr[i]);
    }
    data = Array.from(new Set(data)); //去重
    console.log(data);
    let dataArray: Array<DataType> = [];
    for (let i = 0; i < data.length; i++) {
      let ipInfo = data[i].split(":");
      dataArray.push({
        ip: ipInfo[0],
        state: "未知",
        stateColor: "gray",
        port: ipInfo[1],
        conTimes: 0,
        conRate: 0,
        select: false,
        idx: i,
      })
    }
    setIpData(dataArray);
    console.log(dataArray);
    message.success('共获取到' + data.length + "个节点");
  }

  async function testIp(ip: string, port: number) {
    try {
      const response: any = await axios({
        url: 'http://www.google.com/generate_204',
        // url: 'http://www.gstatic.com/generate_204',
        method: 'get',
        timeout: 5000,
        proxy: {
          host: ip,
          port: port
        }
      });
      console.log(response);
      if (response.status === 204) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      // console.log(err);
      return false;
    }
  }

  async function testLocal() {
    // let status = await testIp("127.0.0.1", 7890);
    // let status = await testIp("180.158.23.175", 3080);
    // let status = await testIp("176.192.70.58", 8016);
    // await osProxy.setProxy('221.225.184.86', 3128); // set http and https proxy
    // console.log(status);
    // if (status) {
    //   message.success('测试成功，ip有效！');
    // } else {
    //   message.error('测试失败，ip无效！');
    // }

    // await osProxy.closeProxy();
  }

  async function testAllIps() {
    console.log("scan start");
    console.log(ipData);
    let [...data] = ipData; //深拷贝
    let vaildNumber = 0;
    const shotNumber: number = data.length; //单次扫描的数量
    scanTimes++;
    setScanLoading(true);
    for (let y = 0; y < data.length; y += shotNumber) {
      let promiseArray = []
      for (let i = y; i < y + shotNumber; i++) {
        if (i >= data.length) break;
        promiseArray.push(testIp(data[i].ip, Number(data[i].port)));
      }
      let resArr = await Promise.all(promiseArray);
      for (let i = y, z = 0; i < y + resArr.length; i++, z++) {
        // console.log("i:" + i + " y:" + y);
        if (resArr[z]) {
          data[i].state = "有效";
          data[i].stateColor = "green";
          vaildNumber++;
          data[i].conTimes++;
        } else {
          data[i].state = "无效";
          data[i].stateColor = "red";
        }
        data[i].conRate = Math.round(data[i].conTimes / scanTimes * 100);
      }
    }
    data.sort((x, y) => {
      return y.conRate - x.conRate;
    });
    //5次后删除连通率低于0.2的节点
    if (scanTimes === 2) {
      console.log("开始删除连通率较低的节点");
      for (let i = 0; i < data.length; i++) {
        if (data[i].conRate <= 20) {
          data.splice(i, data.length - i);
          break;
        }
      }
    }
    setIpData(data);
    console.log(data);
    setScanLoading(false);
    message.success('共检出' + vaildNumber + "个有效节点");
  }

  async function handleListItemClick(item: DataType) {
    clipboard.writeText(item.ip + ":" + item.port);
    message.success(item.ip + ":" + item.port + " 已复制");
  }

  async function resetScanTimes() {
    let [...data] = ipData; //深拷贝
    scanTimes = 0;
    for (let i = 0; i < data.length; i++) {
      data[i].conTimes = 0
    }
    setIpData(data);
  }

  async function handleListenButtonClick() {

    if (!listen) {
      if (ipData.length <= 0) {
        message.error("请先点击左侧获取节点按钮");
      } else {
        setListen(true);
        resetScanTimes();
        message.info("持续监测已打开");
        await testAllIps();
        setTimer(setInterval(async () => { await testAllIps(); }, 30000)); //20秒一次
      }
    } else {
      setListen(false);
      clearInterval(timer);
      message.info("持续监测已关闭");
    }

  }

  async function handleProxyButtonClick() {
    let haveSelected = false;
    let idx = -1;
    for (let i = 0; i < ipData.length; i++) {
      if (ipData[i].select) {
        haveSelected = true;
        idx = i;
      }
    }
    if (haveSelected) {
      setProxyLoading(true);
      try {
        if (!sysProxy) {
          console.log("ip: " + ipData[idx].ip + " port: " + ipData[idx].port);
          await osProxy.setProxy(ipData[idx].ip, ipData[idx].port);
          message.success("系统代理已打开");
          setSysProxy(true);
        } else {
          await osProxy.closeProxy();
          message.info("系统代理已关闭");
          setSysProxy(false);
        }
      } catch (e) {
        Modal.error({
          title: '出错了',
          content: "" + e,
        });
      }

      setProxyLoading(false);
    } else {
      message.error("请勾选列表中的节点");
    }
  }

  async function onProxySelectChange(id: number, e: CheckboxChangeEvent) {
    let [...data] = ipData; //深拷贝
    for (let i = 0; i < data.length; i++) {
      if (data[i].idx == id) {
        data[i].select = e.target.checked;
      } else {
        data[i].select = false;
      }
    }
    setIpData(data);
  }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <Tooltip placement="bottom" title="获取节点列表">
          <Button
            className={styles.refresh_button}
            type="primary"
            shape="circle"
            icon={<ReloadOutlined />}
            loading={refreshLoading}
            onClick={async () => {
              setRefreshLoading(true);
              scanTimes = 0;
              await getData();
              setRefreshLoading(false);
            }}
          />
        </Tooltip>

        <Tooltip placement="bottom" title="持续监测所有节点">
          <Button
            className={styles.test_button}
            type="primary"
            shape="circle"
            icon={<CheckOutlined />}
            loading={scanLoading}
            style={{ background: (listen) ? "green" : "gray" }}
            onClick={() => { handleListenButtonClick() }}
          />
        </Tooltip>

        {/* <Tooltip placement="bottom" title="本地测试">
          <Button
            className={styles.debug_button}
            type="primary"
            shape="circle"
            icon={<BugOutlined />}
            loading={debugLoading}
            onClick={async () => {
              setDebugLoading(true);
              await testLocal();
              setDebugLoading(false);
            }}
          />
        </Tooltip> */}

        <div className={styles.header_right}>
          <Tooltip placement="bottom" title={(sysProxy ? "系统代理已打开" : "系统代理已关闭")}>
            <Button
              className={styles.proxy_button}
              type="primary"
              shape="circle"
              // icon={<PauseOutlined />}
              icon={(sysProxy) ? <PauseOutlined /> : <CaretRightOutlined />}
              loading={proxyLoading}
              style={{ background: (sysProxy) ? "red" : "gray" }}
              onClick={async () => { handleProxyButtonClick() }}
            />
          </Tooltip>
        </div>

      </div>
      <List
        itemLayout="horizontal"
        dataSource={ipData}
        size="small"
        renderItem={(item: DataType) => (
          <List.Item className={styles.list_item}>
            <div className={styles.list_item_content}>
              <div className={styles.list_state}>
                <Progress className={styles.list_progress} type="circle" percent={item.conRate} width={20} format={(percent) => `连通率：${percent}%`} />
              </div>
              <p className={styles.list_ip} onClick={() => { handleListItemClick(item) }}>{item.ip + ":" + item.port}</p>
              <div className={styles.list_item_right}>
                <Checkbox className={styles.list_select_box} disabled={sysProxy} checked={item.select} onChange={(e) => { onProxySelectChange(item.idx, e) }}></Checkbox>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}

export default App
