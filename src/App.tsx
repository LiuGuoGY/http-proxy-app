import React, { Component, useEffect, useState } from 'react';
import styles from 'styles/app.module.scss';
// const { net } = require('@electron/remote')
import axios from 'axios';
import { List, Tag, Button } from "antd";
import { ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';

//使用nodejs环境
axios.defaults.adapter = require('axios/lib/adapters/http');

interface DataType {
  ip: string;
  state: string;
  stateColor: string;
}

const App: React.FC = () => {
  const [ipData, setIpData] = useState<DataType[]>([]);
  const [refreshLoading, setRefreshLoading] = useState<boolean>(false);
  const [testLoading, setTestLoading] = useState<boolean>(false);

  async function getData() {
    const response = await axios.get(
      `https://api.proxyip.info/api.php?key=6666&method=all`
    );
    let data = response.data.split("\r\n");
    if (data[0] === "Times used up") {
      data = ["109.123.219.11:80", "109.194.101.128:3128", "111.21.183.58:9091", "182.92.75.205:60080", "166.104.231.44:8888", "72.170.220.17:8080"];
    }
    let dataArray: Array<DataType> = [];
    for (let i = 0; i < data.length; i++) {
      dataArray.push({
        ip: data[i],
        state: "未知",
        stateColor: "gray",
      })
    }
    setIpData(dataArray);
    console.log(dataArray);
  }

  async function testIp(ip:string, port: number) {
    const response:any = await axios({
      url: 'http://www.google.com/generate_204',
      method: 'get',
      timeout: 1000,
      proxy: {
        host: ip,
        port: port
      }
    });
    console.log(response);
    if(response.status === 204) {
      return true;
    } else {
      return false;
    }
  }

  async function testLocal() {
    let status = await testIp("127.0.0.1", 7890);
    console.log(status);
  }

  // async function testAllIps() {
  //   let data = ipData;
  //   for(let i = 0; i < ipData.length; i++) {
  //     await testIp()
  //   }
  // }

  return (
    <div className={styles.app}>
      <div className={styles.header}>
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
        <Button
          className={styles.test_button}
          type="primary"
          shape="circle"
          icon={<CheckCircleOutlined />}
          loading={testLoading}
          onClick={async () => {
            setTestLoading(true);
            await testLocal();
            setTestLoading(false);
          }}
        />
      </div>
      <List
        itemLayout="horizontal"
        dataSource={ipData}
        size="small"
        renderItem={(item: DataType) => (
          <List.Item className={styles.list_item}>
            <div className={styles.list_item_content}>
              <div className={styles.list_state}>
                <Tag color={item.stateColor}>{item.state}</Tag>
              </div>
              <p className={styles.list_ip}>{item.ip}</p>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}

// class App2 extends React.Component {
//   constructor(props: any) {
//     super(props);
//     this.state = {
//       data: []
//     };
//   }

//   async getData() {
//     axios.get('https://api.proxyip.info/api.php?key=6666&method=all')
//       .then((response: any) => {
//         // console.log(response);
//         let dataArray = response.data.split("\r\n");
//         console.log(dataArray);
//         this.setState({
//           data: dataArray
//         })
//       })
//       .catch(error => console.log(error));
//   }

//   render() {
//     this.getData();
//     return (
//       <div className={styles.app}>
//         <List
//           itemLayout="horizontal"
//           dataSource={this.state.data}
//           renderItem={(item) => (
//             <List.Item>
//               {item}
//             </List.Item>
//           )}
//         />
//       </div>
//     )
//   }
// }

export default App
