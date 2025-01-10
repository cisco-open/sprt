(window.webpackJsonp=window.webpackJsonp||[]).push([[18],{534:function(e,t,a){"use strict";var n=a(535),l=/[\/\?<>\\:\*\|"]/g,r=/[\x00-\x1f\x80-\x9f]/g,c=/^\.+$/,s=/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i,i=/[\. ]+$/;function o(e,t){if("string"!=typeof e)throw new Error("Input must be string");var a=e.replace(l,t).replace(r,t).replace(c,t).replace(s,t).replace(i,t);return n(a,255)}e.exports=function(e,t){var a=t&&t.replacement||"",n=o(e,a);return""===a?n:o(n,"")}},535:function(e,t,a){"use strict";var n=a(536),l=a(537);e.exports=n.bind(null,l)},536:function(e,t,a){"use strict";function n(e){return e>=55296&&e<=56319}function l(e){return e>=56320&&e<=57343}e.exports=function(e,t,a){if("string"!=typeof t)throw new Error("Input must be string");for(var r,c,s=t.length,i=0,o=0;o<s;o+=1){if(r=t.charCodeAt(o),c=t[o],n(r)&&l(t.charCodeAt(o+1))&&(c+=t[o+=1]),(i+=e(c))===a)return t.slice(0,o+1);if(i>a)return t.slice(0,o-c.length+1)}return t}},537:function(e,t,a){"use strict";function n(e){return e>=55296&&e<=56319}function l(e){return e>=56320&&e<=57343}e.exports=function(e){if("string"!=typeof e)throw new Error("Input must be string");for(var t=e.length,a=0,r=null,c=null,s=0;s<t;s++)l(r=e.charCodeAt(s))?null!=c&&n(c)?a+=1:a+=3:r<=127?a+=1:r>=128&&r<=2047?a+=2:r>=2048&&r<=65535&&(a+=3),c=r;return a}},550:function(e,t,a){"use strict";a.r(t);var n=a(0),l=a.n(n),r=a(3),c=a.n(r),s=a(2),i=a(126),o=a.n(i),u=a(534),m=a.n(u),d=a(1),f=a(26),p=a(42),E=a(23);const b=Object(p.a)(()=>a.e(17).then(a.bind(null,551)),{fallback:l.a.createElement("div",{className:"flex-center"},l.a.createElement(d.Spinner,{text:"Fetching data from server..."}))});function g(e){return!!new RegExp("^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$","i").test(e)}const h=({busy:e})=>l.a.createElement(d.DisplayIf,{condition:e},l.a.createElement("span",{className:"icon-animation spin qtr-margin-left"}));h.propTypes={busy:c.a.bool.isRequired};const v=({isOpen:e,closeModal:t})=>{const{setFieldValue:a,values:n}=Object(s.useFormikContext)(),r=l.a.useCallback(e=>{a("csr",e,!1),t()},[t,a]);return l.a.createElement(d.Modal,{closeIcon:!0,closeHandle:t,isOpen:e,size:"large",title:"Edit CSR"},l.a.createElement(s.Formik,{initialValues:{csr:Object(s.getIn)(n,"csr",void 0)},onSubmit:({csr:e})=>r(e),enableReinitialize:!0},({submitForm:e})=>l.a.createElement(l.a.Fragment,null,l.a.createElement(d.ModalBody,{className:"text-left"},l.a.createElement(b,{prefix:"csr"})),l.a.createElement(d.ModalFooter,null,l.a.createElement(d.Button.Light,{onClick:t},"Close"),l.a.createElement(d.Button.Success,{onClick:e},"Save")))))};v.propTypes={isOpen:c.a.bool.isRequired,closeModal:c.a.func.isRequired};const y=({state:e})=>{const[t,a]=l.a.useState(!1),n=l.a.useCallback(()=>a(!1),[]);return l.a.createElement(l.a.Fragment,null,l.a.createElement(d.Button,{color:"can-enroll"!==e?"default":"primary",size:"small",disabled:"can-enroll"!==e,onClick:()=>a(!0)},"Change CSR"),l.a.createElement(v,{isOpen:t,closeModal:n}))};y.propTypes={state:c.a.string},y.defaultProps={state:null};const C=({state:e})=>{const{values:{href:t,name:a},setFieldValue:n}=Object(s.useFormikContext)(),[r,c]=l.a.useState(!1),i=l.a.useCallback(async()=>{try{c(!0),n("certificates",[],!1);const e=await Object(f.k)(a,t);if(Object(E.a)(e))return void n("certificates",e.result.certificates,!1);Object(E.b)(e.error)}catch(e){Object(E.c)("Something went wrong",e)}finally{c(!1)}},[t,a]);return l.a.createElement(d.Button,{color:e?"primary":"default",size:"small",disabled:!e||r,onClick:i},"Test connection",l.a.createElement(h,{busy:r}))};C.propTypes={state:c.a.string},C.defaultProps={state:null};const k=({state:e})=>{const{values:{href:t,name:a,certificates:n,csr:r,signer:c},setFieldValue:i}=Object(s.useFormikContext)(),[o,u]=l.a.useState(!1),m=l.a.useCallback(async()=>{try{u(!0),i("canSave",!1,!1);const e=await Object(f.l)(a,t,c,n.reduce((e,t)=>[...e,t.pem],[]),r);if(Object(E.a)(e))return i("canSave",!0,!1),void d.toast.success("","All good, you can save now.");Object(E.b)(e.error)}catch(e){Object(E.c)("Something went wrong",e)}finally{u(!1)}},[t,a,n,c,r]);return l.a.createElement(d.Button,{color:"can-enroll"!==e?"default":"primary",size:"small",disabled:"can-enroll"!==e||o,onClick:m},"Test enrollment",l.a.createElement(h,{busy:o}))};k.propTypes={state:c.a.string},k.defaultProps={state:null};const w=()=>{const{values:{href:e,certificates:t}}=Object(s.useFormikContext)(),[a,n]=l.a.useState(null);return l.a.useEffect(()=>{g(e)&&Array.isArray(t)&&t.length?n("can-enroll"):g(e)?n("can-test"):n(null)},[e,t]),l.a.createElement("div",{className:"base-margin-top flex-center flex"},l.a.createElement(C,{state:a}),l.a.createElement("span",{className:"icon-arrow-right-tail half-margin-left half-margin-right"}),l.a.createElement(y,{state:a}),l.a.createElement("span",{className:"icon-arrow-right-tail half-margin-left half-margin-right"}),l.a.createElement(k,{state:a}))},x=()=>{const{values:{certificates:e}}=Object(s.useFormikContext)(),t=l.a.useCallback((e,t)=>{o()(e,m()(`${t.join(" ")}.pem`),"application/x-pem-file ")},[]),a=l.a.useCallback((e,t)=>{Object(d.confirmation)(l.a.createElement(l.a.Fragment,null,"Save certificate ",l.a.createElement("span",{className:"text-bold"},t.join(", "))," as trusted?"),async()=>{try{const t=await Object(f.i)("",e,"trusted");if(Object(E.a)(t))return t.found?d.toast.success("","Certificate saved"):d.toast.info("","Certificate wasn't saved since it is in DB already"),!0;Object(E.b)(t.error)}catch(e){Object(E.c)("Something went wrong",e)}return!1})},[]);return e.length?l.a.createElement(d.Panel,{color:"light",raised:!0,bordered:!0,className:"base-margin-top"},l.a.createElement("h5",null,"Certificates:"),e.map(e=>{const n=e.subject.slice().reverse(),r=e.issuer.slice().reverse();return l.a.createElement(d.Panel,{color:"light",key:e.serial},l.a.createElement("div",{className:"flex"},l.a.createElement("h6",{className:"flex-fluid"},n.join(", ")),l.a.createElement("ul",{className:"list list--inline flex-center-vertical"},l.a.createElement("li",null,l.a.createElement("a",{className:"link",onClick:()=>t(e.pem,n),"data-balloon":"Download","data-balloon-pos":"up"},l.a.createElement("span",{className:"icon-download"}))),l.a.createElement("li",null,l.a.createElement("div",{className:"v-separator"})),l.a.createElement("li",null,l.a.createElement("a",{className:"link",onClick:()=>a(e.pem,n),"data-balloon":"Save as trusted","data-balloon-pos":"up"},l.a.createElement("span",{className:"icon-save"}))))),l.a.createElement("dl",{className:"dl--inline-wrap dl--inline-centered"},l.a.createElement("dt",null,"Issuer"),l.a.createElement("dd",null,r.join(", ")),l.a.createElement("dt",null,"Serial Number"),l.a.createElement("dd",null,e.serial),l.a.createElement("dt",null,"Valid from"),l.a.createElement("dd",null,e.notBefore),l.a.createElement("dt",null,"Valid till"),l.a.createElement("dd",null,e.notAfter)))})):null},O=({data:e})=>{const{values:{href:t,certificates:a},initialValues:{href:n,certificates:r},setFieldValue:c}=Object(s.useFormikContext)();l.a.useEffect(()=>{t!==n||a.length?t!==n&&c("certificates",[],!1):c("certificates",r,!1)},[t,n]),l.a.useEffect(()=>{a.length||c("canSave",!1,!1)},[a]);const{result:{signers:i}}=e,o=l.a.useCallback(e=>e&&i.find(t=>t.id===e)?void 0:"Valid signing certificate is required",[i]);return l.a.createElement(l.a.Fragment,null,l.a.createElement(s.Field,{component:d.Input,name:"name",label:"Name",validate:e=>e?void 0:"Name is required"}),l.a.createElement(s.Field,{component:d.Input,name:"href",label:"SCEP server URL",validate:e=>e?void 0:"URL is required"}),l.a.createElement(s.Field,{component:d.Select,name:"signer",title:"Signing certificate",validate:o},i.map(e=>l.a.createElement("option",{value:e.id,key:e.id},e.friendly_name))),l.a.createElement(w,null),l.a.createElement(x,null))};O.propTypes={data:c.a.shape({result:c.a.shape({signers:c.a.arrayOf(c.a.any),ca_certificates:c.a.arrayOf(c.a.any),name:c.a.string,signer:c.a.string,url:c.a.string})}).isRequired};t.default=O}}]);