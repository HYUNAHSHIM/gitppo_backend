const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const port = 8080;
require('dotenv').config()

app.use(cors());
app.use(express.json());

app.post(`/auth`, async (req, res) => {
  try {
    const { code } = req.body;
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      code, 
      //client_id: "8034b9cee0aef2068649", 
      //client_secret: "6b267929c4996d79a95883c322c3c5d5ff490383"
      client_id: "faaba046e9350cc82be8",
      client_secret: "0a88654046c8aeed6c1a16684a1a1fcb197d6f2b"
    },
    {
      headers: {
        accept: 'application/json',
      }
    });
    const token = response.data.access_token;
    const result = [];

    // 사용자 정보 가져오기
    const user = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`
      }
    });
    
    // 사용자 레포 정보 가져오기
    const repos = await axios.get(`https://api.github.com/users/${user.data.login}/repos`, {
      headers: {
        Authorization: `token ${token}`
      }
    });
    // 사용자 레포별 언어 & 리드미 정보 가져오기
    for await (let repo of repos.data) {
      let tmp = {};
      
      const languageData = await axios.get(`https://api.github.com/repos/${user.data.login}/${repo.name}/languages`, {
        headers: {
          Authorization: `token ${token}`
        }
      });
      const branchData = await axios.get(`https://api.github.com/repos/${user.data.login}/${repo.name}/branches`, {
        headers: {
          Authorization: `token ${token}`
        }
      });

      let readmeData = {};
      for await (let branch of branchData.data) {
        try {
          readmeData = await axios.get(`https://raw.githubusercontent.com/${user.data.login}/${repo.name}/${branch.name}/README.md`, {
            headers: {
              Authorization: `token ${token}`
            }
          });
          tmp.readme = readmeData.data;
          break;
        } catch (ex) {
          if (ex.response && ex.response.status === 404) {
            tmp.readme = ""
          }
        }
      }
      
      tmp.name = repo.name;
      tmp.owner = repo.owner;
      tmp.description = repo.description;
      tmp.url = repo.html_url;
      tmp.languages = languageData.data;
      tmp.created_at = repo.created_at;
      tmp.updated_at = repo.updated_at;

      result.push(tmp);
    }
    const responseData = {
      user: user.data.login,
      repos: result
    };
    console.log(responseData)
    // 응답
    return res.status(200).json(responseData);
  } catch (err) {
    console.error(err.message);
  }
  
});

app.use((req, res, next) => {
  res.status(404).send('Wrong Api uri');
});

app.listen(process.env.PORT || port, () => {
  console.log("Express App starts on port " + port);
});