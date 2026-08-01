In a Gradle build file, these three blocks answer three different questions:

## `plugins`

**What build capabilities does this project need?**

Plugins add tasks, conventions, and configuration to Gradle.

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.5.0'
}
```

Examples:

* `java` adds Java compilation and testing tasks.
* `org.springframework.boot` adds Spring Boot tasks such as `bootRun` and `bootJar`.

Think of plugins as:

> **Tools that teach Gradle how to build your project.**

---

## `repositories`

**Where should Gradle search for external libraries and plugins?**

```groovy
repositories {
    mavenCentral()
}
```

Gradle searches these locations when it needs to download dependencies.

Other examples:

```groovy
repositories {
    mavenCentral()
    mavenLocal()

    maven {
        url = uri('https://example.com/repository')
    }
}
```

Think of repositories as:

> **Stores or servers where Gradle looks for packages.**

---

## `dependencies`

**Which external libraries does the project use?**

```groovy
dependencies {
    implementation 'com.google.guava:guava:33.4.8-jre'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.12.0'
}
```

Examples:

* `implementation`: needed by the main application.
* `testImplementation`: needed only for tests.
* `runtimeOnly`: needed when running, but not when compiling.
* `compileOnly`: needed for compilation, but not included at runtime.

Think of dependencies as:

> **The actual libraries your code needs.**

---

## How they work together

```groovy
plugins {
    id 'java'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'com.google.guava:guava:33.4.8-jre'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.12.0'
}
```

This means:

1. Use the Java plugin to build the project.
2. Search Maven Central for libraries.
3. Download and use Guava and JUnit.

A simple analogy:

* **plugins** = the workers and tools
* **repositories** = the warehouses
* **dependencies** = the materials ordered from those warehouses

One subtle point: the `repositories` block normally controls project dependencies. Gradle plugins may be downloaded from plugin repositories configured separately in `settings.gradle`, usually inside `pluginManagement`.
