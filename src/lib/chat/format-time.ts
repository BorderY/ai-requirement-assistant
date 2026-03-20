export function formatTime(iso:string){
    return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    });
}

// 时间格式化工具
