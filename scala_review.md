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

可以直接用格式化字符串。

如果你的意思是：

- 小数点前固定 **5 位**
- 不足前面补 `0`
- 小数点后固定 **2 位**
- 最后仍然是 `String`

例如：

```scala
val list: List[String] = List("3.45", "113.1116", "25.6")

val result: List[String] = list.map { s =>
  f"${s.toDouble}%08.2f"
}

println(result)
```

结果：

```scala
List("00003.45", "00113.11", "00025.60")
```

这里 `%08.2f` 可以拆开理解：

```text
%08.2f
 ││ │
 ││ └── 小数点后 2 位
 │└──── 总长度 8 位
 └───── 不够的地方补 0
```

因为你需要：

```text
5位整数 + 1个小数点 + 2位小数
= 总共8个字符
```

所以：

```scala
f"${value}%08.2f"
```

例如：

| 原始 String  | 结果         |
| ------------ | ------------ |
| `"3.45"`     | `"00003.45"` |
| `"113.1116"` | `"00113.11"` |
| `"25.6"`     | `"00025.60"` |
| `"12345.67"` | `"12345.67"` |

如果你说的“**小数前保留5位**”并不是补 `0`，而只是**最多允许5位整数**，那写法会不一样。

DataFrame 列的转换：
这种 SQL 风格的处理，DataFrame 简洁、容易理解，也方便 Spark 优化。

val result = df
.filter(col("total") > 1000000)
.select("customer", "total")
.withColumn("total", col("total").cast("string"))

DataSet
Dataset 的强类型 API 就更有吸引力。不过，简单条件过滤仍然可以直接使用 DataFrame，且通常更高效。
val result = ds
.filter(sale => sale.total > 1000000)
.map(sale => sale.customer)
.map(customer => customer.toUpperCase)

why collect()?
因为 `DataFrame` 和 `DataSet` 都是懒加载的。下面是Plan
val df2 = df.filter(...)
collect() 触发真正执行, 在本地driver上，受到memory限制. 不再是多个executor
val rows = df2.collect()
更严重的是，如果你处理 1 亿条数据，原始数据量可能达到 50 GB。这时候把所有记录收集到一台机器，往往就失去了使用 Spark 分布式计算的意义。

如果只需要知道交易总数：
val totalCount = df.count()

没有必要使用：
val totalCount = df.collect().length
第二种方法会把所有记录都传回 Driver，仅仅为了计算数量，效率很差

DataFrame 和 Dataset 的 collect() 有什么区别？
它们都支持 .collect()，但返回的数组类型不同。
DataFrame 会返回Array[Row]
val results = df.collect()
results.foreach { row =>
println(row.getAs[String]("customer"))
}

Dataset 会返回Array[T]

Array[Object]
case class Sale(
id: Int,
customer: String,
total: Double
)

import spark.implicits.\_

val ds = Seq(
Sale(1, "Alice", 1500000),
Sale(2, "Bob", 500000)
).toDS()
val results = ds.collect()
Array[Sale]
results.foreach { sale =>
println(sale.customer)
println(sale.total)
}

将结果物化（Materialize）到内存中
Spark 可能需要从多个远程 Executor 通过网络把数据传回 Driver。

// not Row,

所以 .collect() 的成本不仅是内存，还有网络传输。

Spark 可能需要从多个远程 Executor 通过网络把数据传回 Driver。

所以 .collect() 的成本不仅是内存，还有网络传输。

reduceByKey() vs groupByKey()
但对于大型数据集，如果只是计算每组总和，一般推荐 reduceByKey。

因为 reduceByKey 可以先在各个分区内进行局部聚合，减少 Shuffle 时需要传输的数据。

Spark 官方文档也明确建议，在按 Key 求和、求平均等聚合场景中，通常优先考虑 reduceByKey 或 aggregateByKey，而不是 groupByKey。
Spark 4.3.
4.3.0 引入了 `.mapPartitions()` 方法，允许对每个分区进行自定义处理。

七、实际项目：100 万条销售记录，Scala + Spark + SQL Server
现在把所有概念整合到一个 ETL（Extract、Transform、Load）项目中。
以下代码假设 spark 已经创建，Spark 环境中已经配置 SQL Server JDBC 驱动，CSV 文件路径有效。

import org.apache.spark.sql.SparkSession
import org.apache.spark.sql.functions.\_

val spark = SparkSession.builder()
.appName("SalesAudit")
.getOrCreate()

// Step 1: Extract - 读取 CSV
val salesDF = spark.read
.option("header", "true")
.schema("""
id INT,
customer STRING,
total DECIMAL(18,2)
""")
.csv("sales.csv")

// Step 2: Transform - 筛选大额交易
val largeSales = salesDF
.filter(col("total") > 1000000)

// Step 3: Transform - 按客户分组聚合
val summary = largeSales
.groupBy("customer")
.agg(
sum("total").alias("total_amount"),
count("\*").alias("transaction_count")
)

// Step 4: Action - 显示结果
summary.show()

// Step 5: Action - 写入 SQL Server
val jdbcUrl =
"jdbc:sqlserver://localhost:1433;" +
"databaseName=SalesDB;" +
"encrypt=true;" +
"trustServerCertificate=false;"

val jdbcProps = new java.util.Properties()
jdbcProps.setProperty("user", sys.env("SQL_USER"))
jdbcProps.setProperty("password", sys.env("SQL_PASSWORD"))
jdbcProps.setProperty(
"driver",
"com.microsoft.sqlserver.jdbc.SQLServerDriver"
)

summary.write
.mode("append")
.jdbc(jdbcUrl, "dbo.SalesAuditSummary", jdbcProps)
对于生产环境，需要正确配置 SQL Server TLS 证书，提前设计目标表、重复写入处理机制，以及审计批次标识。上例是聚合统计结果，并不是保存全部原始大额交易明细。2. 每一步究竟做了什么？
| 操作 | 类型 | 主要作用 |
|---|---|---|
| spark.read.csv | 数据源读取 | 创建 DataFrame，可能进行必要的元数据读取 |
| filter | Transformation | 创建筛选计划 |
| groupBy | 分组操作 | 指定聚合分组 |
| agg | Transformation | 创建求和、计数计划 |
| show | Action | 执行计算并显示结果 |
| write.jdbc | Action | 执行计算并写入数据库 |
