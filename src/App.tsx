import React, { Component, useEffect, useState } from 'react';
import styles from 'styles/app.module.scss';
const { clipboard } = require('@electron/remote')
import axios from 'axios';
import { List, Tag, Button, message, Tooltip, Switch } from "antd";
import { ReloadOutlined, CheckCircleOutlined, BugOutlined } from '@ant-design/icons';

//使用nodejs环境
axios.defaults.adapter = require('axios/lib/adapters/http');
message.config({
  top: 480,
  duration: 2,
  maxCount: 1,
});

interface DataType {
  ip: string;
  state: string;
  stateColor: string;
  port: string;
  con: number;  //连通率
}

const App: React.FC = () => {
  const [ipData, setIpData] = useState<DataType[]>([]);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);
  const [listen, setListen] = useState<boolean>(false);
  const [timer, setTimer] = useState<NodeJS.Timer>();

  //返回xxx.xxx.xxx.xxx:pppp的字符串数组
  async function requestProxyip() {
    try {
      const response = await axios({
        url: `https://api.proxyip.info/api.php?key=6666&method=all`,
        // url: "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        method: 'get',
        timeout: 5000,
      });
      console.log(response);
      let data = response.data.split("\r\n");
      // let data = response.data.split("\n");
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
        // url: `https://api.proxyip.info/api.php?key=6666&method=all`,
        url: "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        method: 'get',
        timeout: 5000,
      });
      console.log(response);
      // let data = response.data.split("\r\n");
      let data = response.data.split("\n");
      return data;
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  async function getData() {
    let promiseArray = [];
    let data: Array<string> = [];
    promiseArray.push(requestProxyip());
    promiseArray.push(requestGithubip());
    let resArr = await Promise.all(promiseArray);
    for (let i = 0; i < resArr.length; i++) {
      data = data.concat(resArr[i]);
    }
    console.log(data);
    let dataArray: Array<DataType> = [];
    for (let i = 0; i < data.length; i++) {
      let ipInfo = data[i].split(":");
      dataArray.push({
        ip: ipInfo[0],
        state: "未知",
        stateColor: "gray",
        port: ipInfo[1],
        con: 0
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
    let status = await testIp("176.192.70.58", 8016);
    console.log(status);
    if (status) {
      message.success('测试成功，ip有效！');
    } else {
      message.error('测试失败，ip无效！');
    }
  }

  async function testAllIps() {
    let [...data] = ipData; //深拷贝
    let vaildNumber = 0;
    // for (let i = 0; i < data.length; i++) {
    //   data[i].state = "未知";
    //   data[i].stateColor = "gray";
    // }
    // setIpData(data);
    const shotNumber: number = data.length; //单次扫描的数量
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
        } else {
          data[i].state = "无效";
          data[i].stateColor = "red";
        }
      }
      // setIpData(data);
    }
    data.sort((x, y) => {
      if (x.state === "有效") {
        return -1;
      } else {
        return 0;
      }
    });
    setIpData(data);
    if (vaildNumber <= 0) {
      message.error('无有效节点');
    } else {
      message.success('共检出' + vaildNumber + "个有效节点");
    }
  }

  async function handleListItemClick(item: DataType) {
    clipboard.writeText(item.ip + ":" + item.port);
    message.success(item.ip + ":" + item.port + " 已复制");
  }

  async function handleListenButtonClick() {
    if(!listen) {
      setListen(true);
      testAllIps();
      setTimer(setInterval(testAllIps, 20000)); //20秒一次
      message.info("持续监测已打开");
    } else {
      setListen(false);
      clearInterval(timer);
      message.info("持续监测已关闭");
    }
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
            icon={<CheckCircleOutlined />}
            style={{background: (listen)?"green":"gray"}}
            onClick={() => { handleListenButtonClick() }}
          />
        </Tooltip>

        <Tooltip placement="bottom" title="本地测试">
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
        </Tooltip>

      </div>
      <List
        itemLayout="horizontal"
        dataSource={ipData}
        size="small"
        renderItem={(item: DataType) => (
          <List.Item className={styles.list_item} onClick={() => { handleListItemClick(item) }}>
            <div className={styles.list_item_content}>
              <div className={styles.list_state}>
                <Tag color={item.stateColor}>{item.state}</Tag>
              </div>
              <p className={styles.list_ip}>{item.ip + ":" + item.port}</p>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}

export default App
