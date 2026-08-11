在 Scala 里，`Seq[(String, Long)]` 和 `Map[String, Long]` 看起来都能保存 `"名字 -> 数字"`，但用途很不一样。

### 1. `Seq[(String, Long)]`

这是一个**有顺序的 tuple 列表**。

```scala
val data: Seq[(String, Long)] = Seq(
  ("Alice", 10L),
  ("Bob", 20L),
  ("Alice", 30L)
)
```

特点：

- 保留顺序
- **允许重复 key**
- 适合逐个遍历
- 本质上每个元素是一个 `Tuple2[String, Long]`

例如：

```scala
data.foreach { case (name, count) =>
  println(s"$name -> $count")
}
```

输出：

```text
Alice -> 10
Bob -> 20
Alice -> 30
```

注意这里 `"Alice"` 可以出现两次。

---

### 2. `Map[String, Long]`

这是一个**key-value 映射表**：

```scala
val data: Map[String, Long] = Map(
  "Alice" -> 10L,
  "Bob" -> 20L
)
```

特点：

- 每个 key 必须唯一
- 非常适合根据 key 快速查 value
- 语义是 `"key 对应一个 value"`

例如：

```scala
println(data("Alice"))
```

得到：

```text
10
```

或者更安全：

```scala
data.get("Alice")
```

得到：

```scala
Some(10)
```

---

### 最大区别：重复 key

例如：

```scala
val seq = Seq(
  ("Alice", 10L),
  ("Alice", 30L)
)
```

这是完全合法的。

但是：

```scala
val map = Map(
  "Alice" -> 10L,
  "Alice" -> 30L
)
```

最终通常只会留下：

```scala
Map("Alice" -> 30L)
```

因为 `Map` 一个 key 只能对应一个 value。

---

### 在 Spark 里经常看到这种转换

比如：

```scala
val counts: Seq[(String, Long)] =
  Seq(
    ("apple", 10L),
    ("banana", 5L)
  )
```

转换成 Map：

```scala
val countMap = counts.toMap
```

得到：

```scala
Map(
  "apple" -> 10L,
  "banana" -> 5L
)
```

然后可以：

```scala
countMap("apple")
```

得到：

```text
10
```

### 可以这样记

| 类型                  | 含义                 | 重复 key  | 顺序      | 适合           |
| --------------------- | -------------------- | --------- | --------- | -------------- |
| `Seq[(String, Long)]` | 一系列 `(key,value)` | ✅ 可以   | ✅ 有顺序 | 遍历、保留记录 |
| `Map[String, Long]`   | key → value          | ❌ 不可以 | 不应依赖  | 按 key 查询    |

比如做 **word count**：

```scala
Seq(
  ("hello", 3L),
  ("spark", 5L)
)
```

如果你只是要输出结果，用 `Seq` 很自然。

如果后面经常需要：

```scala
counts("spark")
```

那么转成 `Map[String, Long]` 更方便。

另外你写的类型语法应该是：

```scala
Seq[(String, Long)]
Map[String, Long]
```

不是：

```scala
Seq([String, Long])
Map(String, Long)
```

Scala 的**泛型用 `[]`，Tuple 用 `()`**。

```scala

val number:Int = 1
...:Boolean = true
:Char = ‘a'
:Double = 3.14
: Float = 3.24
： Long = 12222
： Byte = 127
:String = hello + " There"
println(f"Pi is about $piSinglePrecision%.3f") 3.143
println(f"Pi is about $piSinglePrecision%05d") 00001

if（1 > 3) println("Impossbiel"） else println（“The world is coret"

// Matching
val number = 3
number match {
case 1 => println("one")
csase 2 => println("Two")
}

while ( x > 10){}
do {..} while ( x <= 10)

functional language
def squareIt（x: Int） ：Int = { x \* x}

data structure
// Tuple, one-based index
val capt = ("Pacard", "Eneter","NCC1")
println(capt.-1)
println(capt.\_2)

// Tuple 2
val picarsShip = ”Picard" -> "enterPrice"
println(picarsShip.\_1)

//List
val shipList = List("En1", "E2", "E3")
// 0 based
println(shipList(0)))
println(shipList.head） En1
println(shipList.tail) E2, E3

for(ship <- shipList) {println(ship)}

// reduce() combine together all the items in a collection
val numberList = List(1,2,3,4)
val sum = numberList.reduce（（x:Int,y:Int)=> x +y )

// concatenate Lists
val moreNumber = Lsit(5,6)
val lostsN = numberList ++ moreNumbers

var reversed = numberList.reverse 5,4,3,
var sorted = reversed.sorted 3,4,5

var maxValue = numberList.max
var numberToalt = numerList.sum
var hasThree = numberList.contains(3)

val shiMap = Map("Mik" -> "Deep", "Jane" -> "Valy")
Map[String, String]
println（shiMap（”Mik"))

val sear = util.Try（ship("Archer")） getOrElse "Unknown"
println(archersShip）

SparkContext - RDD
Spark -
```
