You do **not** need to master all Groovy to write Jenkins Pipelines. Learn the Jenkins Pipeline structure, a few Groovy collection operations, and the most-used Pipeline steps.

Jenkins supports two styles:

- **Declarative Pipeline**: structured and easier to maintain
- **Scripted Pipeline**: more flexible, but more Groovy-heavy

For your work, start with **Declarative Pipeline**.

## 1. The basic structure to memorize

```groovy
pipeline {
    agent any

    environment {
        REPORT_PATH = 'playwright-report/results.json'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm run playwright'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished'
        }
    }
}
```

Understand these keywords first:

| Syntax        | Purpose                                |
| ------------- | -------------------------------------- |
| `pipeline`    | Defines the entire pipeline            |
| `agent`       | Specifies where it runs                |
| `environment` | Defines environment variables          |
| `stages`      | Contains the pipeline stages           |
| `stage`       | Defines one logical phase              |
| `steps`       | Contains commands for that stage       |
| `post`        | Runs actions after a stage or pipeline |
| `always`      | Runs regardless of success or failure  |

The Jenkins Declarative Pipeline syntax defines these sections and supports `post` conditions such as `always`, `success`, `failure`, and `unstable`. ([Jenkins][1])

---

# 2. Most important Jenkins functions

## `echo`

Print information in the Jenkins console:

```groovy
echo 'Starting Playwright tests'
```

With a variable:

```groovy
echo "Workspace: ${env.WORKSPACE}"
```

## `bat` and `sh`

For Windows agents:

```groovy
bat 'npm ci'
bat 'npm run playwright'
```

For Linux agents:

```groovy
sh 'npm ci'
sh 'npm run playwright'
```

## `dir`

Temporarily changes the working directory:

```groovy
dir('frontend-tests') {
    bat 'npm ci'
    bat 'npm run playwright'
}
```

After the block finishes, Jenkins returns to the previous directory.

## `fileExists`

Checks whether a file exists:

```groovy
if (fileExists('playwright-report/results.json')) {
    echo 'Report found'
}
```

This must normally be inside a `script` block in Declarative Pipeline.

## `readFile`

Reads a text file:

```groovy
script {
    def content = readFile('output.txt')
    echo content
}
```

## `readJSON`

Reads a JSON file and converts it into Groovy maps and lists:

```groovy
script {
    def report = readJSON file: 'playwright-report/results.json'
}
```

`readJSON` is provided by the **Pipeline Utility Steps** plugin, not Jenkins Pipeline core. It returns a map or list that Groovy code can process. ([Jenkins][2])

## `archiveArtifacts`

Preserves report files after the workspace is cleaned:

```groovy
archiveArtifacts artifacts: 'playwright-report/**/*',
                 allowEmptyArchive: true
```

## `catchError`

Allows the pipeline to continue after a failed command while still recording the failure:

```groovy
catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
    bat 'npm run playwright'
}
```

Jenkins documents that `catchError` catches an exception, sets the build or stage result, and continues with the following Pipeline instructions. ([Jenkins][3])

However, for your requirement, `returnStatus: true` is often easier.

---

# 3. Essential Groovy for Jenkins

You mainly need these concepts.

## Variables

```groovy
def reportPath = 'playwright-report/results.json'
int failedCount = 0
```

## Lists

```groovy
def failedNames = []
failedNames.add('Login scenario')
```

Shorter form:

```groovy
failedNames << 'Login scenario'
```

## Iteration

```groovy
failedNames.each { name ->
    echo "Failed: ${name}"
}
```

## Safe navigation: `?.`

```groovy
report.suites?.each { suite ->
    // ...
}
```

If `suites` is null, Groovy does not throw a null-pointer error.

## Default value: `?:`

```groovy
def suites = report.suites ?: []
```

This means:

> Use `report.suites`; otherwise, use an empty list.

## `findAll`

```groovy
def failures = results.findAll { result ->
    result.status == 'failed'
}
```

## `any`

```groovy
def failed = results.any { result ->
    result.status == 'failed'
}
```

These few Groovy features cover a large percentage of Jenkinsfile logic.

---

# 4. Print the workspace folder structure

Because you appear to use Windows Jenkins agents, use:

```groovy
stage('Show Workspace') {
    steps {
        echo "Workspace: ${env.WORKSPACE}"
        bat 'tree /F /A'
    }
}
```

Meaning:

- `/F`: includes files
- `/A`: uses ordinary ASCII characters, which display better in Jenkins logs

Example output:

```text
C:.
|   Jenkinsfile
|   package.json
|   playwright.config.ts
|
+---src
|   +---features
|   +---steps
|
+---playwright-report
|       results.json
|
+---node_modules
```

However, printing `node_modules` can produce an enormous log. A safer Windows PowerShell version excludes it:

```groovy
stage('Show Workspace') {
    steps {
        powershell '''
            Write-Host "Workspace: $env:WORKSPACE"

            Get-ChildItem -Path . -Recurse -Force |
                Where-Object {
                    $_.FullName -notmatch '\\\\node_modules\\\\' -and
                    $_.FullName -notmatch '\\\\.git\\\\'
                } |
                ForEach-Object {
                    $_.FullName.Replace("$env:WORKSPACE\\", "")
                }
        '''
    }
}
```

For a Linux Jenkins agent:

```groovy
sh '''
    echo "Workspace: $WORKSPACE"
    find . \
      -path './node_modules' -prune -o \
      -path './.git' -prune -o \
      -print
'''
```

---

# 5. Make Playwright create a JSON report

Playwright includes a built-in JSON reporter and supports multiple reporters at the same time. ([Playwright][4])

In `playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["list"],
    ["json", { outputFile: "playwright-report/results.json" }],
    [
      "html",
      {
        outputFolder: "playwright-report/html",
        open: "never",
      },
    ],
  ],
});
```

Your `package.json` could contain:

```json
{
  "scripts": {
    "playwright": "playwright test"
  }
}
```

Playwright’s standard command for running tests is `npx playwright test`. ([Playwright][5])

---

# 6. Important problem: failed tests stop the stage

Normally:

```groovy
bat 'npm run playwright'
```

throws an error when Playwright returns a nonzero exit code. Jenkins may therefore skip the following statements in that stage.

Use:

```groovy
script {
    int testExitCode = bat(
        script: 'npm run playwright',
        returnStatus: true
    )

    echo "Playwright exit code: ${testExitCode}"
}
```

With `returnStatus: true`, Jenkins returns the exit code instead of immediately throwing an exception.

Then you can:

1. Run the tests.
2. Read the JSON report.
3. Print failed test names.
4. Mark the build as failed afterward.

---

# 7. Complete Jenkinsfile: Windows version

This example assumes the **standard Playwright JSON reporter**.

```groovy
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        REPORT_PATH = 'playwright-report/results.json'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Environment Information') {
            steps {
                bat 'node --version'
                bat 'npm --version'
                bat 'npx playwright --version'
                echo "Workspace: ${env.WORKSPACE}"
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
                bat 'npx playwright install'
            }
        }

        stage('Show Workspace') {
            steps {
                powershell '''
                    Write-Host "Workspace structure:"

                    Get-ChildItem -Path . -Recurse -Force |
                        Where-Object {
                            $_.FullName -notmatch '\\\\node_modules\\\\' -and
                            $_.FullName -notmatch '\\\\.git\\\\'
                        } |
                        ForEach-Object {
                            $_.FullName.Replace("$env:WORKSPACE\\", "")
                        }
                '''
            }
        }

        stage('Run Playwright Tests') {
            steps {
                script {
                    int testExitCode = bat(
                        script: 'npm run playwright',
                        returnStatus: true
                    )

                    env.PLAYWRIGHT_EXIT_CODE = testExitCode.toString()

                    echo "Playwright exit code: ${testExitCode}"
                }
            }
        }

        stage('Print Failed Tests') {
            steps {
                script {
                    if (!fileExists(env.REPORT_PATH)) {
                        error(
                            "Playwright JSON report was not created: " +
                            "${env.REPORT_PATH}"
                        )
                    }

                    def report = readJSON file: env.REPORT_PATH
                    def failedTests = []

                    collectFailedPlaywrightTests(
                        report.suites ?: [],
                        [],
                        failedTests
                    )

                    echo '========================================'
                    echo "Failed test count: ${failedTests.size()}"
                    echo '========================================'

                    if (failedTests.isEmpty()) {
                        echo 'No failed Playwright tests were found.'
                    } else {
                        failedTests.eachWithIndex { testName, index ->
                            echo "${index + 1}. ${testName}"
                        }
                    }

                    int exitCode =
                        (env.PLAYWRIGHT_EXIT_CODE ?: '0') as int

                    if (exitCode != 0) {
                        currentBuild.result = 'FAILURE'
                        error(
                            "Playwright finished with exit code " +
                            "${exitCode}. Failed tests were printed above."
                        )
                    }
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts(
                artifacts: 'playwright-report/**/*',
                allowEmptyArchive: true
            )
        }

        success {
            echo 'All Playwright tests passed.'
        }

        failure {
            echo 'The Playwright test execution failed.'
        }
    }
}

/*
 * Recursively walks through Playwright suites.
 *
 * Playwright JSON normally contains:
 * suites -> suites/specs -> tests -> results
 */
def collectFailedPlaywrightTests(
    List suites,
    List parentTitles,
    List failedTests
) {
    suites.each { suite ->
        def currentTitles = parentTitles +
            ([suite.title].findAll { it })

        /*
         * Nested describe blocks can contain more suites.
         */
        collectFailedPlaywrightTests(
            suite.suites ?: [],
            currentTitles,
            failedTests
        )

        /*
         * Each spec represents a test declaration.
         */
        (suite.specs ?: []).each { spec ->
            def fullTitleParts =
                currentTitles + ([spec.title].findAll { it })

            (spec.tests ?: []).each { test ->
                boolean failed = (test.results ?: []).any { result ->
                    result.status == 'failed' ||
                    result.status == 'timedOut' ||
                    result.status == 'interrupted'
                }

                if (failed) {
                    String projectName =
                        test.projectName ?: 'default'

                    String fullTitle =
                        fullTitleParts.join(' > ')

                    failedTests << "${fullTitle} [${projectName}]"
                }
            }
        }
    }
}
```

---

# 8. Simpler parser when you know the exact JSON structure

Before writing complicated parsing code, inspect the report:

```groovy
stage('Inspect JSON') {
    steps {
        script {
            def report = readJSON file: env.REPORT_PATH

            echo "Root keys: ${report.keySet()}"
            echo "Suite count: ${(report.suites ?: []).size()}"
        }
    }
}
```

You can also temporarily print part of it:

```groovy
script {
    def reportText = readFile(env.REPORT_PATH)

    echo reportText.take(3000)
}
```

Avoid printing the entire report if it contains screenshots, error stacks, attachments, or a large number of tests.

---

# 9. If your JSON is Cucumber-style

Your previous code looks like a Cucumber JSON structure:

```groovy
report.each { feature ->
    feature.elements?.each { scenario ->
        def statuses = scenario.steps?.collect {
            it.result?.status
        } ?: []

        if (statuses.any { it == 'failed' }) {
            // scenario failed
        }
    }
}
```

For that JSON format, use this parser:

```groovy
stage('Print Failed Scenarios') {
    steps {
        script {
            def reportPath = 'reports/report.json'

            if (!fileExists(reportPath)) {
                error "Report not found: ${reportPath}"
            }

            def report = readJSON file: reportPath
            def failedScenarios = []

            report.each { feature ->
                (feature.elements ?: []).each { scenario ->
                    def statuses =
                        (scenario.steps ?: []).collect { step ->
                            step.result?.status
                        }

                    boolean failed = statuses.any { status ->
                        status == 'failed'
                    }

                    if (failed) {
                        String featureName =
                            feature.name ?: 'Unknown feature'

                        String scenarioName =
                            scenario.name ?: 'Unknown scenario'

                        failedScenarios <<
                            "${featureName} > ${scenarioName}"
                    }
                }
            }

            echo "Failed scenario count: ${failedScenarios.size()}"

            failedScenarios.eachWithIndex { name, index ->
                echo "${index + 1}. ${name}"
            }

            if (!failedScenarios.isEmpty()) {
                currentBuild.result = 'FAILURE'
            }
        }
    }
}
```

The correct parser depends on which report you actually generate:

- Playwright built-in JSON reporter
- Cucumber JSON formatter
- A third-party multiple-reporters package
- A custom reporter

These formats are not interchangeable.

---

# 10. Best way to guarantee report processing after tests

Another clean design is to use `try/finally`:

```groovy
stage('Run and Analyse Tests') {
    steps {
        script {
            int testExitCode = 0

            try {
                testExitCode = bat(
                    script: 'npm run playwright',
                    returnStatus: true
                )
            } finally {
                if (fileExists(env.REPORT_PATH)) {
                    def report = readJSON file: env.REPORT_PATH

                    // Analyse report here
                } else {
                    echo "Report not found: ${env.REPORT_PATH}"
                }
            }

            if (testExitCode != 0) {
                error "Playwright failed with exit code ${testExitCode}"
            }
        }
    }
}
```

Jenkins Pipeline steps throw exceptions when they fail, and standard Groovy `try/catch/finally` can be used to control that behavior. ([Jenkins][1])

---

# 11. A focused learning order

Learn Jenkins Pipeline in this order:

1. `pipeline`, `agent`, `stages`, `stage`, `steps`
2. `bat` or `sh`, `echo`, `dir`
3. `environment` and `env.VARIABLE`
4. `script` blocks and `def`
5. `post`, `always`, `success`, `failure`
6. `returnStatus`, `catchError`, `error`
7. `fileExists`, `readFile`, `readJSON`
8. Groovy `each`, `collect`, `findAll`, `any`
9. `archiveArtifacts` and test-report publishing
10. Functions placed outside the `pipeline` block

The key distinction is:

```groovy
bat 'npm run playwright'
```

is a **Jenkins Pipeline step**, while:

```groovy
failedTests.each { test ->
    echo test
}
```

combines a **Groovy collection method and closure** with the Jenkins `echo` step.

For your immediate project, the most valuable pattern to master is:

```groovy
int exitCode = bat(
    script: 'npm run playwright',
    returnStatus: true
)

// Read and analyse the report here.

if (exitCode != 0) {
    error 'Tests failed'
}
```

That pattern ensures failed tests do not prevent Jenkins from reading the report and printing every failed scenario name.

[1]: https://www.jenkins.io/doc/book/pipeline/syntax/?utm_source=chatgpt.com "Pipeline Syntax"
[2]: https://www.jenkins.io/doc/pipeline/steps/pipeline-utility-steps/?utm_source=chatgpt.com "Pipeline Utility Steps"
[3]: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/?utm_source=chatgpt.com "Pipeline: Basic Steps"
[4]: https://playwright.dev/docs/test-reporters?utm_source=chatgpt.com "Reporters"
[5]: https://playwright.dev/docs/test-cli?utm_source=chatgpt.com "Command line"
