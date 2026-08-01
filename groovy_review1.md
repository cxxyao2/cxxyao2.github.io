To learn enough **Groovy for Gradle build files quickly**, do not try to master the whole Groovy language. Focus on the small part used by the **Gradle Groovy DSL**.

## 1. Learn these Groovy basics first

### Variables

```groovy
def projectName = 'my-app'
def versionNumber = 1.0

String environment = 'dev'
```

`def` means Groovy infers the variable type.

### Strings

```groovy
def name = 'Gradle'
def message = "Hello, ${name}"
```

- Single quotes: normal strings
- Double quotes: support `${}` interpolation

### Lists and maps

```groovy
def environments = ['dev', 'test', 'prod']

def config = [
    host: 'localhost',
    port: 8080
]

println config.host
println config['port']
```

Lists and maps appear frequently in Gradle configuration.

### Closures

Closures are the most important Groovy concept for Gradle:

```groovy
def greet = { name ->
    println "Hello, ${name}"
}

greet('Jennifer')
```

A closure is similar to a Java lambda, but it is more flexible.

---

## 2. Understand that most Gradle blocks are method calls

This Gradle code:

```groovy
repositories {
    mavenCentral()
}
```

is conceptually similar to:

```groovy
repositories({
    mavenCentral()
})
```

The `{ ... }` part is a closure passed to the `repositories` method.

Similarly:

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
}
```

can be understood as:

```groovy
dependencies {
    implementation('org.springframework.boot:spring-boot-starter-web')
}
```

Groovy often allows parentheses to be omitted.

This is one of the most important ideas for understanding Gradle files.

---

## 3. Focus on the common Gradle blocks

Learn these first:

```groovy
plugins {
    id 'java'
}

group = 'com.example'
version = '1.0.0'

repositories {
    mavenCentral()
}

dependencies {
    implementation 'com.google.guava:guava:33.0.0-jre'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
}

tasks.test {
    useJUnitPlatform()
}
```

You should understand what each block configures, rather than memorizing every Groovy rule.

---

## 4. Learn task syntax

### Registering a task

```groovy
tasks.register('hello') {
    doLast {
        println 'Hello from Gradle'
    }
}
```

### Task with `doFirst` and `doLast`

```groovy
tasks.register('buildReport') {
    doFirst {
        println 'Preparing the report'
    }

    doLast {
        println 'Report completed'
    }
}
```

- `doFirst`: adds an action at the beginning
- `doLast`: adds an action at the end

### Task dependencies

```groovy
tasks.register('prepareFiles')

tasks.register('packageApp') {
    dependsOn 'prepareFiles'
}
```

---

## 5. Learn property assignment

Gradle commonly uses both of these styles:

```groovy
version = '1.0.0'
```

and:

```groovy
archiveFileName = 'my-app.jar'
```

Older scripts may use method-style configuration:

```groovy
sourceCompatibility JavaVersion.VERSION_17
```

Do not assume every unfamiliar line is special Groovy syntax. It may be a method or property provided by a Gradle plugin.

---

## 6. Learn collection operations

Groovy collection syntax is very useful in build scripts:

```groovy
def files = ['app.jar', 'source.jar', 'test.jar']

def runtimeFiles = files.findAll {
    !it.contains('source')
}

runtimeFiles.each {
    println it
}
```

Important methods:

```groovy
each
collect
find
findAll
any
every
```

Examples:

```groovy
def numbers = [1, 2, 3]

numbers.each { number ->
    println number
}

def doubled = numbers.collect {
    it * 2
}

def largeNumbers = numbers.findAll {
    it > 1
}
```

`it` is the implicit closure parameter.

---

## 7. Learn file operations used by Gradle

```groovy
def configFile = file('config/application.properties')

if (configFile.exists()) {
    println configFile.text
}
```

Copying files:

```groovy
tasks.register('copyConfig', Copy) {
    from 'src/main/config'
    into "$buildDir/config"
    include '*.properties'
}
```

Useful concepts:

- `file()`
- `files()`
- `from`
- `into`
- `include`
- `exclude`
- `fileTree`

---

## 8. Learn conditional logic

```groovy
def environment = project.findProperty('env') ?: 'dev'

if (environment == 'prod') {
    println 'Production build'
} else {
    println 'Non-production build'
}
```

Run it with:

```bash
gradle build -Penv=prod
```

The `?:` operator is called the **Elvis operator**:

```groovy
def value = suppliedValue ?: 'default'
```

It means: use `suppliedValue`; otherwise, use `'default'`.

---

## 9. Distinguish Groovy from Gradle

Consider:

```groovy
bootJar {
    archiveFileName = 'application.jar'
}
```

These parts come from different places:

- `{}` and assignment syntax come from Groovy.
- `bootJar` comes from the Spring Boot Gradle plugin.
- `archiveFileName` is a Gradle task property.

Therefore, when you do not understand a line, ask:

1. Is it Groovy syntax?
2. Is it part of the Gradle API?
3. Is it provided by a plugin?

This distinction will save you a lot of time.

## A fast learning plan

### First hour

Learn:

- `def`
- strings and interpolation
- lists and maps
- closures
- omitted parentheses
- `it`

### Second hour

Read a small `build.gradle` file and identify:

- plugins
- repositories
- dependencies
- tasks
- properties

### Third hour

Practise writing:

```groovy
tasks.register('hello')
tasks.register('copyFiles', Copy)
tasks.named('test')
dependencies { }
```

### After that

Read real build files from your project. For every unfamiliar block, search the relevant **Gradle task or plugin documentation**, rather than studying unrelated Groovy features.

## What you can initially ignore

You probably do not need these for ordinary Gradle scripts:

- metaprogramming
- AST transformations
- advanced traits
- operator overloading
- Groovy web frameworks
- complex class design
- advanced dynamic dispatch

The most important mental model is:

> A Gradle Groovy file is mostly method calls, property assignments, and closures used to configure Gradle objects.
