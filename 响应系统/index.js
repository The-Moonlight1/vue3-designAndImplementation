

// 存储副作用函数的桶
const bucket = new WeakMap()

// 用一个全局变量存储被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect(fn) {
    const effectFn = ()=>{
        // 调用 cleanup 函数完成清除工作
        cleanup(effectFn)
        // 当 effectFn 执行时，将其设置为当前激活的副作用函数
        activeEffect = effectFn
        fn()
    }
    // activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
    effectFn.deps = []
    // 执行副作用函数
    effectFn()
}

function cleanup(effectFn) {
    // 遍历 effectFn.deps 数组
    for(let i = 0;i<effectFn.deps.length ; i++) {
        // deps 是依赖的集合
        const deps = effectFn.deps[i]
        // 将 effectFn 从依赖集合中移除
        deps.delete(effectFn)
    }
    // 最后需要重置 effectFn.deps 数组
    effectFn.deps.length = 0
}

// 原始数据 
const data = { ok: false,text: "hello world" }

// 对原始数据的代理
const obj = new Proxy(data,{
    // 拦截读取操作
    get(target,key,obj){
        // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
        track(target,key)
        // 返回属性值
        return  target[key]
    },
    // 拦截设置操作
    set(target,key,newVal,obj){
        // 设置属性值
        target[key] = newVal
        // 把副作用函数从桶里取出并执行
        trigger(target,key)
    }
    
})
// 在 get 拦截函数内调用 track 函数追踪变化
function track(target,key){
    // 没有 activeEffect ，直接 return
    if(!activeEffect) return target[key]
    // 根据 target 从 "桶" 中取得 depsMap,它也是一个 Map 类型 : key --> effects
    let depsMap = bucket.get(target)
    // 如果不存在 depsMap , 那么新建一个 Map 并与 target 关联
    if(!depsMap) bucket.set(target,(depsMap = new Map()))
    // 在根据 key 从 depsMap 中取得 deps 它是一个 Set 类型
    // 里面存储着所有与当前 key 相关联的 副作用函数： effects
    let deps = depsMap.get(key)
    // 如果 deps 不存在，同样新建一个 Set 并与 key 关联
    if(!deps){
        depsMap.set(key,(deps = new Set()))
    }
    // 把当前激活的副作用函数添加到依赖集合 deps 中
    deps.add(activeEffect)
    // deps 就是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到 activeEffect.deps 数组中
    activeEffect.deps.push(deps)
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger(target,key){
    console.log("key",key);
    // 根据 target 从桶中取得 depsMap，它是 key --> effects
    const depsMap = bucket.get(target)
    if(!depsMap) return
    // 根据 key 取得所有副作用函数 effects
    const effects = depsMap.get(key)

    // 执行副作用函数
    const effectsToRun = new Set(effects)
    effectsToRun.forEach(effectFn => effectFn())
}

// 执行副作用函数，触发读取
effect(()=>{
    console.log('effect run');
    document.body.innerText = obj.ok ? obj.text : 'not'
})
// 1 秒后修改响应式数据
setTimeout(()=>{
    console.log("setTimeout :");
    obj.notExist = 'hello vue3'
    obj.text = 'obj.text'
},1000)
