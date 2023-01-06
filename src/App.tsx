import React, { Component, useEffect, useState } from 'react';
import styles from 'styles/app.module.scss';
const { clipboard  } = require('@electron/remote')
import axios from 'axios';
import { List, Tag, Button, message, Tooltip } from "antd";
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
}

const App: React.FC = () => {
  const [ipData, setIpData] = useState<DataType[]>([]);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [debugLoading, setDebugLoading] = useState<boolean>(false);

  //返回xxx.xxx.xxx.xxx:pppp的字符串数组
  async function requestProxyip() {
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
  }

  async function requestGithubip() {
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
  }

  async function getData() {
    try {
      const response = await axios({
        url: `https://api.proxyip.info/api.php?key=6666&method=all`,
        // url: "https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        method: 'get',
        timeout: 5000,
        proxy: {
          host: "127.0.0.1",
          port: 7890
        }
      });
      console.log(response);
      let data = response.data.split("\r\n");
      // let data = response.data.split("\n");
      if (data[0] === "Times used up") {
        data = ["109.123.219.11:80", "109.194.101.128:3128", "111.21.183.58:9091", "182.92.75.205:60080", "166.104.231.44:8888", "72.170.220.17:8080"];
      } else {
        data.pop();
      }
      let dataArray: Array<DataType> = [];
      for (let i = 0; i < data.length; i++) {
        let ipInfo = data[i].split(":");
        dataArray.push({
          ip: ipInfo[0],
          state: "未知",
          stateColor: "gray",
          port: ipInfo[1],
        })
      }
      setIpData(dataArray);
      console.log(dataArray);
    } catch (err) {
      console.log(err);
    }


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
    let data = ipData;
    let vaildNumber = 0;
    // for (let i = 0; i < data.length; i++) {
    //   data[i].state = "未知";
    //   data[i].stateColor = "gray";
    // }
    // setIpData(data);
    const shotNumber: number = 500;
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
      setIpData(data);
    }
    await sortIpData();
    if (vaildNumber <= 0) {
      message.error('无有效节点');
    } else {
      message.success('有' + vaildNumber + "个有效节点");
    }
  }

  async function sortIpData() {
    let data = ipData;
    data.sort((x, y) => {
      if (x.state === "有效") {
        return -1;
      } else {
        return 0;
      }
    });
    setIpData(data);
  }

  async function handleListItemClick(item:DataType) {
    clipboard.writeText(item.ip + ":" + item.port);
    message.success(item.ip + ":" + item.port + " 已复制");
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

        <Tooltip placement="bottom" title="检查所有节点">
          <Button
            className={styles.test_button}
            type="primary"
            shape="circle"
            icon={<CheckCircleOutlined />}
            loading={testLoading}
            onClick={async () => {
              setTestLoading(true);
              await testAllIps();
              setTestLoading(false);
            }}
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
          <List.Item className={styles.list_item} onClick={()=>{handleListItemClick(item)}}>
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
