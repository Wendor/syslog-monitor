export interface Message {
    facility: number;
    severity: number;
    tag: string;
    time: string;
    hostname: string;
    address: string;
    family: string;
    port: number;
    size: number;
    msg: string;
    id: number;
};