<template>
    <el-row>
        <el-col :span="18" :offset="3">
            <el-card class="box-card company-card">
                <div class="clearfix card-header">
                    <span>Журнал Syslog</span>
                </div>
                <no-ssr>
                    <div class="clearfix">
                        <el-tag :key="tag" v-for="tag in dynamicTags" closable :disable-transitions="false"
                            @close="handleClose(tag)">
                            {{ tag }}
                        </el-tag>
                        <el-input class="input-new-tag" v-if="inputVisible" v-model="inputValue" ref="saveTagInput"
                            size="small" @keyup.enter="handleInputConfirm" @blur="handleInputConfirm">
                        </el-input>
                        <el-button v-else class="button-new-tag" size="small" @click="showInput" type="success" plain>+
                            фильтр</el-button>
                    </div>
                </no-ssr>

                <div id="subscribe" class="clearfix">
                    <div v-for="message in messages" v-bind:key="message.id" v-bind:class="'facility-' + message.facility">
                        {{ formatMessage(message) }}
                    </div>
                </div>
            </el-card>
        </el-col>
    </el-row>
</template>
  
<style>
.el-header {
    line-height: 60px;
}

.box-card {
    margin-top: 20px;
    margin-bottom: 20px;
}

.box-card .text {
    font-size: 14px;
}

.box-card .card-header {
    line-height: 40px;
    font-weight: bold;
}

.box-card .clearfix:before,
.box-card .clearfix:after {
    display: table;
    content: "";
}

.box-card .clearfix:after {
    clear: both;
}

.el-select .el-input {
    width: 110px;
}
</style>
<style scoped>
#subscribe>div {
    /*border-bottom: #cdcdcd 1px solid;*/
    padding: 7px !important;
}

#subscribe>div:hover {
    background-color: #dcdcdc;
    color: #000;
}

div.facility-0 {
    color: #000000;
    background-color: #ff0000;
}

div.facility-1 {
    color: #000000;
    background-color: #ff0000;
}

div.facility-2 {
    color: #FFFFFF;
    background-color: #F56C6C;
}

div.facility-3 {
    color: #FFFFFF;
    background-color: #F56C6C;
}

div.facility-4 {
    color: #000000;
    background-color: #feff9a;
}

div.facility-5 {
    color: #000000;
    background-color: #8cceff;
}

div.facility-6 {
    color: #000000;
    background-color: #ffffff;
}

div.facility-7 {
    color: #aaaaaa;
    background-color: #ffffff;
}

.el-tag {
    margin-right: 10px;
    margin-top: 10px;
}

.button-new-tag {
    margin-right: 10px;
    margin-top: 10px;
    height: 32px;
    line-height: 30px;
    padding-top: 0;
    padding-bottom: 0;
}

.input-new-tag {
    width: 90px;
    margin-right: 10px;
    margin-top: 10px;
    vertical-align: bottom;
}

#subscribe {
    font-family: monospace;
    font-size: 12px;
    min-height: 480px;
    border: 1px solid #ebeef5;
    margin-top: 30px;
    background-color: #ffffff;
}

#subscribe:-webkit-full-screen {
    border: none;
}

#subscribe:-moz-full-screen {
    border: none;
}

#subscribe:-ms-fullscreen {
    border: none;
}

#subscribe:fullscreen {
    border: none;
}
</style>
  
<script lang="ts" setup>
import { onMounted, ref, nextTick } from 'vue';
import { Message } from '../Message';
import moment from 'moment';

let counter = 0;
const websocketServerLocation = 'ws://localhost:5050';

const messages = ref([] as Message[]);
const storedTags = JSON.parse(localStorage.getItem('syslogFilters') ?? '["error"]');
const dynamicTags = ref(storedTags as string[]);
const inputVisible = ref(false);
const inputValue = ref('');
const maxMessages = ref(256);
let ws: WebSocket;

onMounted(() => {
    connect();
});

const connect = (): void => {
    ws = new WebSocket(websocketServerLocation);
    messages.value = [];

    ws.addEventListener('open', () => {
        applyFilters();
    });

    ws.addEventListener('message', (e) => {
        console.log(e);
        let incomeMessages: Message[] = JSON.parse(e.data);
        if (!(incomeMessages instanceof Array)) return;

        for (let message of incomeMessages) {
            message.id = counter++;
            if (messages.value.unshift(message) > maxMessages.value) {
                do {
                    messages.value.pop();
                } while (messages.value.length > maxMessages.value)
            }
        }
    });

    ws.addEventListener('error', (error: unknown) => {
        if (error instanceof Error) {
            console.log(error.message);
        }
    });

    ws.addEventListener('close', () => {
        setTimeout(() => connect(), 5000);
    });
};

const saveTags = async () => {
    messages.value = [];
    localStorage.setItem("syslogFilters", JSON.stringify(dynamicTags.value));
    applyFilters();
};

const handleClose = (tag: string) => {
    dynamicTags.value.splice(dynamicTags.value.indexOf(tag), 1);
    saveTags();
};

const showInput = () => {
    inputVisible.value = true;
    nextTick(() => {
        console.log('need focus');
        // this.$refs.saveTagInput.$refs.input.focus();
    });
};

const handleInputConfirm = () => {
    let value = inputValue.value;
    if (inputValue) {
        console.log(dynamicTags.value);
        dynamicTags.value.push(value);
        saveTags();
    }
    inputVisible.value = false;
    inputValue.value = '';
};

const applyFilters = async () => {
    let filters = {
        keywords: dynamicTags.value
    };
    ws.send(JSON.stringify(filters));
};

const formatTime = (time: string) => {
    return moment(time).local().format('YYYY-MM-DD HH:mm:ss');
};

const formatMessage = (message: Message) => {
    return [
        formatTime(message.time),
        message.address,
        message.hostname,
        message.tag,
        message.msg,
    ].join(' ');
}
</script>
