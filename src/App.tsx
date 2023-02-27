import React, { Component, useEffect, useState } from 'react';
import styles from 'styles/app.module.scss';
const { app, clipboard } = require('@electron/remote')
import axios from 'axios';
import { List, Tag, Button, message, Tooltip, Progress, Checkbox, Modal } from "antd";
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ReloadOutlined, CheckOutlined, BugOutlined, PauseOutlined, CaretRightOutlined } from '@ant-design/icons';
const osProxy = require('cross-os-proxy');
const regedit = require('regedit');

let timer: any = null;
// let ipData: DataType[] = [];

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

const RefreshButton: React.FC<any> = (props) => {
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);

  //返回xxx.xxx.xxx.xxx:pppp的字符串数组
  async function requestProxyip() {
    try {
      const response = await axios({
        url: `https://api.proxyip.info/api.php?key=6666&method=all`,
        method: 'get',
        timeout: 5000,
      });
      console.log(`https://api.proxyip.info/api.php?key=6666&method=all`);
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
        url: "https://ghproxy.com/https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt",
        method: 'get',
        timeout: 5000,
      });
      console.log(`https://ghproxy.com/https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt`);
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
      console.log(`http://proxy.boysave.com/all/`);
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

  async function getIpData() {
    let promiseArray = [];
    let data: Array<string> = [];
    promiseArray.push(requestProxyip());
    promiseArray.push(requestGithubip());
    promiseArray.push(requestBoySaveProxyList());
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

    //数据请求成功回调
    props.onDataReady(dataArray);

    console.log(dataArray);
    message.success('共获取到' + data.length + "个节点");

    return dataArray;
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
      if (response.status === 204) {
        console.log(response);
        return true;
      } else {
        return false;
      }
    } catch (err) {
      // console.log(err);
      return false;
    }
  }

  async function testAllIps(data:DataType[]) {
    let scanTimes:number = 0;
    let vaildNumber = 0;
    let shotNumber: number = (data.length < 500)?data.length:500; //单次扫描的数量
    for(let zz = 0; zz < 5; zz++) {
      scanTimes++;
      for (let y = 0; y < data.length; y += shotNumber) {
        let promiseArray = []
        for (let i = y; i < y + shotNumber; i++) {
          if (i >= data.length) break;
          promiseArray.push(testIp(data[i].ip, Number(data[i].port)));
        }
        let resArr = await Promise.all(promiseArray);
        for (let i = y, z = 0; i < y + resArr.length; i++, z++) {
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

    }
    data = data.filter((d) => d.conRate > 80);
    data.sort((x, y) => {
      return y.conRate - x.conRate;
    });
    console.log(data);

    //数据请求成功回调
    props.onDataReady(data);
    message.success('共检出' + data.length + "个良好节点");
  }

  return (
    <div>
      <Tooltip placement="bottom" title="获取节点列表">
        <Button
          className={styles.refresh_button}
          type="primary"
          shape="circle"
          icon={<ReloadOutlined />}
          loading={refreshLoading}
          onClick={async () => {
            setRefreshLoading(true);
            let ipData = await getIpData();
            await testAllIps(ipData);
            setRefreshLoading(false);
          }}
        />
      </Tooltip>
    </div>
  )
}

const ProxyButton: React.FC<any> = (props) => {

  const [sysProxy, setSysProxy] = useState<boolean>(false);
  const [proxyLoading, setProxyLoading] = useState<boolean>(false);

  async function handleProxyButtonClick() {
    try {
      if (!sysProxy) {
        if (props.ipData) {
          let ip = props.ipData.ip;
          let port = props.ipData.port;
          setProxyLoading(true);
          console.log("ip: " + ip + " port: " + port);
          await osProxy.setProxy(ip, port);
          message.success("系统代理已打开");
          setSysProxy(true);
          setProxyLoading(false);
        } else {
          message.error("请勾选列表中的节点");
        }
      } else {
        setProxyLoading(true);
        await osProxy.closeProxy();
        message.info("系统代理已关闭");
        setSysProxy(false);
        setProxyLoading(false);
      }
    } catch (e) {
      Modal.error({
        title: '出错了',
        content: "" + e,
      });
    }
  }

  return (
    <div>
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
  )
}

const Menu: React.FC<any> = (props) => {

  return (
    <div className={styles.header}>
      <RefreshButton onDataReady={props.onDataReady}></RefreshButton>
      <div className={styles.header_right}>
        <ProxyButton ipData={props.ipData}></ProxyButton>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const [ipData, setIpData] = useState<DataType[]>([]);
  const [selIdx, setSelIdx] = useState<number>(-1);

  async function handleListItemClick(item: DataType) {
    clipboard.writeText(item.ip + ":" + item.port);
    message.success(item.ip + ":" + item.port + " 已复制");
  }

  async function onProxySelectChange(id: number, e: CheckboxChangeEvent) {
    let [...data] = ipData; //深拷贝
    setSelIdx(-1);
    for (let i = 0; i < data.length; i++) {
      if (data[i].idx == id) {
        data[i].select = e.target.checked;
        if(e.target.checked) {
          setSelIdx(i);
        }
      } else {
        data[i].select = false;
      }
    }
    setIpData(data);
  }

  //selectIp={}
  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <Menu onDataReady={(data: DataType[]) => { setIpData(data) }} ipData={(selIdx >= 0)?ipData[selIdx]:null}/>
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
                <Checkbox className={styles.list_select_box} checked={item.select} onChange={(e) => { onProxySelectChange(item.idx, e) }}></Checkbox>
              </div>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}

export default App
