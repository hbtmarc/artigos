import{r as s,j as t,k as r,l as o,m as n,n as i}from"./index.esm2017.BeiKNkIx.js";var c="firebase",p="10.14.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */s(c,p,"app");const a="AIzaSyAXmX69aACPuZ7l0cBlMMbdIS5y_vfKE6o",g="artigos-marc35.firebaseapp.com",m="artigos-marc35",d="artigos-marc35.firebasestorage.app",f="9603625342",A="1:9603625342:web:0eadfe685568ac7610432f",b="G-5ZXD6M41ZF";if(a.trim().length===0)throw new Error("Missing PUBLIC_FIREBASE_API_KEY. Check .env (local) and GitHub Actions Variables (prod).");const l={apiKey:a,authDomain:g,projectId:m,storageBucket:d,messagingSenderId:f,appId:A,measurementId:b},e=o().length>0?n():i(l),h=t(e),u=r(e);export{h as auth,u as db};
