可以。按照你到目前为止描述的真实架构，我建议最终程序就是：

```text
公司 OIDC / SSO
      ↓
认证用户
      ↓
HTTP Header: X-Authenticated-User: john
      ↓
Spring Boot
      ↓
Active Directory 查询 john 的 LDAP groups
      ↓
group-permissions.json
      ↓
ApiAuthority enum
      ↓
SimpleGrantedAuthority
      ↓
Spring Security Authentication
      ↓
@PreAuthorize
      ↓
Controller method
```

这里 **Spring Boot 不负责用户名/密码登录**，LDAP/AD 也不是拿来验证密码，而只是根据 username 查询 groups。

下面给你一个完整的 demo。为了方便理解，我把之前有些复杂的 Stream 改成了普通 `for` 循环。

---

# 项目结构

```text
src
└── main
    ├── java
    │   └── com.example.demo
    │       ├── DemoApplication.java
    │       │
    │       ├── security
    │       │   ├── ApiAuthority.java
    │       │   ├── GroupPermissionService.java
    │       │   ├── ActiveDirectoryGroupService.java
    │       │   ├── HeaderAuthenticationFilter.java
    │       │   └── SecurityConfig.java
    │       │
    │       └── controller
    │           └── ItemController.java
    │
    └── resources
        ├── application.yml
        └── group-permissions.json
```

---

# 1. Maven dependencies

如果你已经有 Spring Boot 项目，只需要确认有这些：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-ldap</artifactId>
</dependency>
```

Jackson 已经由 `spring-boot-starter-web` 带进来了。

这里不需要：

```text
LdapBindAuthenticationManagerFactory
setUserDnPatterns()
```

因为你的用户不是通过 Spring Boot 登录 LDAP。

---

# 2. JSON 权限配置

`src/main/resources/group-permissions.json`

```json
{
  "aGroup": ["get", "delete", "update"],

  "bGroup": ["get", "update"],

  "cGroup": ["post"]
}
```

意思：

```text
aGroup
→ GET
→ DELETE
→ UPDATE

bGroup
→ GET
→ UPDATE

cGroup
→ POST
```

例如用户属于：

```text
aGroup
cGroup
```

最终就有：

```text
API_GET
API_DELETE
API_UPDATE
API_POST
```

---

# 3. `ApiAuthority` enum

`ApiAuthority.java`

```java
package com.example.demo.security;

import java.util.Locale;

public enum ApiAuthority {

    API_GET("API_GET"),
    API_POST("API_POST"),
    API_UPDATE("API_UPDATE"),
    API_DELETE("API_DELETE");

    private final String authority;

    ApiAuthority(String authority) {
        this.authority = authority;
    }

    public String getAuthority() {
        return authority;
    }

    /**
     * JSON:
     *
     * get
     * post
     * update
     * delete
     *
     * 转成:
     *
     * API_GET
     * API_POST
     * API_UPDATE
     * API_DELETE
     */
    public static ApiAuthority fromConfigValue(
            String value) {

        if (value == null ||
                value.isBlank()) {

            throw new IllegalArgumentException(
                    "Authority value cannot be empty"
            );
        }

        String normalized =
                value.trim()
                     .toUpperCase(Locale.ROOT);

        /*
         * 同时支持：
         *
         * "get"
         *
         * 和：
         *
         * "API_GET"
         */
        if (!normalized.startsWith("API_")) {
            normalized = "API_" + normalized;
        }

        return ApiAuthority.valueOf(normalized);
    }
}
```

所以：

```java
ApiAuthority.fromConfigValue("get")
```

得到：

```java
ApiAuthority.API_GET
```

而：

```java
ApiAuthority.API_GET.getAuthority()
```

得到：

```text
API_GET
```

---

# 4. 读取 JSON

`GroupPermissionService.java`

```java
package com.example.demo.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;


@Service
public class GroupPermissionService {

    private final ObjectMapper objectMapper;

    /*
     * 程序真正使用的配置。
     *
     * 例如：
     *
     * agroup ->
     *      API_GET
     *      API_DELETE
     *      API_UPDATE
     *
     * bgroup ->
     *      API_GET
     *      API_UPDATE
     */
    private Map<String, Set<ApiAuthority>>
            permissionConfig = Map.of();


    public GroupPermissionService(
            ObjectMapper objectMapper) {

        this.objectMapper = objectMapper;
    }


    /*
     * Spring 创建完这个 Service 后，
     * 自动执行一次。
     *
     * 不是每一个 request 都读 JSON。
     */
    @PostConstruct
    public void loadConfig()
            throws IOException {

        ClassPathResource resource =
                new ClassPathResource(
                        "group-permissions.json"
                );

        try (InputStream inputStream =
                     resource.getInputStream()) {

            /*
             * JSON 原始数据：
             *
             * {
             *   "aGroup": ["get", "delete", "update"],
             *   "bGroup": ["get", "update"],
             *   "cGroup": ["post"]
             * }
             *
             *
             * 转成 Java：
             *
             * aGroup ->
             *   [get, delete, update]
             *
             * bGroup ->
             *   [get, update]
             *
             * cGroup ->
             *   [post]
             */
            Map<String, List<String>> config =
                    objectMapper.readValue(
                            inputStream,
                            new TypeReference<
                                    Map<
                                        String,
                                        List<String>
                                    >
                            >() {}
                    );


            Map<String, Set<ApiAuthority>>
                    normalizedConfig =
                    new HashMap<>();


            for (Map.Entry<
                    String,
                    List<String>
                    > entry :
                    config.entrySet()) {


                /*
                 * aGroup
                 *
                 * ↓
                 *
                 * agroup
                 */
                String groupName =
                        entry.getKey()
                             .trim()
                             .toLowerCase(
                                     Locale.ROOT
                             );


                if (normalizedConfig
                        .containsKey(groupName)) {

                    throw new IllegalStateException(
                            "Duplicate group: "
                            + groupName
                    );
                }


                EnumSet<ApiAuthority> authorities =
                        EnumSet.noneOf(
                                ApiAuthority.class
                        );


                /*
                 * ["get", "delete", "update"]
                 *
                 * ↓
                 *
                 * API_GET
                 * API_DELETE
                 * API_UPDATE
                 */
                for (String permission :
                        entry.getValue()) {

                    try {

                        ApiAuthority authority =
                                ApiAuthority
                                    .fromConfigValue(
                                        permission
                                    );

                        authorities.add(authority);

                    } catch (
                        IllegalArgumentException ex
                    ) {

                        throw new IllegalStateException(
                                "Invalid permission '"
                                + permission
                                + "' for group '"
                                + entry.getKey()
                                + "'",
                                ex
                        );
                    }
                }


                normalizedConfig.put(
                        groupName,
                        Set.copyOf(authorities)
                );
            }


            /*
             * 最终：
             *
             * permissionConfig =
             *
             * {
             *   agroup ->
             *       [API_GET,
             *        API_DELETE,
             *        API_UPDATE],
             *
             *   bgroup ->
             *       [API_GET,
             *        API_UPDATE],
             *
             *   cgroup ->
             *       [API_POST]
             * }
             */
            permissionConfig =
                    Map.copyOf(
                            normalizedConfig
                    );
        }
    }


    /**
     * 根据用户的 LDAP groups，
     * 算出最终 API authorities。
     */
    public Set<ApiAuthority> getPermissions(
            Set<String> userGroups) {

        EnumSet<ApiAuthority> permissions =
                EnumSet.noneOf(
                        ApiAuthority.class
                );


        for (String group : userGroups) {

            /*
             * AD 可能返回：
             *
             * AGroup
             *
             * JSON 是：
             *
             * aGroup
             *
             * 全部变 lowercase。
             */
            String normalizedGroup =
                    group.trim()
                         .toLowerCase(
                                 Locale.ROOT
                         );


            Set<ApiAuthority>
                    groupPermissions =
                    permissionConfig.get(
                            normalizedGroup
                    );


            if (groupPermissions != null) {

                /*
                 * 多个 group 的权限取并集。
                 */
                permissions.addAll(
                        groupPermissions
                );
            }
        }


        return Set.copyOf(permissions);
    }
}
```

这里已经不再返回：

```java
Set<String>
```

而是：

```java
Set<ApiAuthority>
```

这样 Java 编译器可以帮你控制权限类型。

---

# 5. 从 Active Directory 查询用户 groups

`ActiveDirectoryGroupService.java`

```java
package com.example.demo.security;

import org.springframework.ldap.core.LdapTemplate;
import org.springframework.ldap.query.LdapQuery;

import org.springframework.stereotype.Service;

import javax.naming.NamingEnumeration;
import javax.naming.NamingException;

import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;

import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.springframework.ldap.query
        .LdapQueryBuilder.query;


@Service
public class ActiveDirectoryGroupService {

    private final LdapTemplate ldapTemplate;


    public ActiveDirectoryGroupService(
            LdapTemplate ldapTemplate) {

        this.ldapTemplate = ldapTemplate;
    }


    public Set<String> getGroups(
            String username) {

        /*
         * 假设公司 AD 使用：
         *
         * sAMAccountName = john
         */
        LdapQuery ldapQuery =
                query()
                    .where("objectClass")
                    .is("user")
                    .and("sAMAccountName")
                    .is(username);


        List<Set<String>> results =
                ldapTemplate.search(
                        ldapQuery,
                        this::mapGroups
                );


        if (results.isEmpty()) {
            return Set.of();
        }


        if (results.size() > 1) {

            throw new IllegalStateException(
                    "Multiple AD users found for "
                    + username
            );
        }


        return results.get(0);
    }


    /**
     * AD user:
     *
     * memberOf:
     *
     * CN=aGroup,OU=ApplicationGroups,
     * DC=company,DC=com
     *
     * CN=employee,OU=Groups,
     * DC=company,DC=com
     *
     *
     * ↓
     *
     * aGroup
     * employee
     */
    private Set<String> mapGroups(
            Attributes attributes)
            throws NamingException {

        Set<String> groups =
                new HashSet<>();


        Attribute memberOf =
                attributes.get("memberOf");


        if (memberOf == null) {
            return groups;
        }


        NamingEnumeration<?> values =
                memberOf.getAll();


        try {

            while (values.hasMore()) {

                String groupDn =
                        values.next()
                              .toString();


                String groupName =
                        extractGroupName(
                                groupDn
                        );


                groups.add(groupName);
            }

        } finally {

            values.close();
        }


        return groups;
    }


    /**
     * CN=aGroup,OU=ApplicationGroups,
     * DC=company,DC=com
     *
     * ↓
     *
     * aGroup
     */
    private String extractGroupName(
            String groupDn)
            throws NamingException {

        LdapName ldapName =
                new LdapName(groupDn);


        for (Rdn rdn :
                ldapName.getRdns()) {

            if ("CN".equalsIgnoreCase(
                    rdn.getType())) {

                return rdn
                        .getValue()
                        .toString();
            }
        }


        return groupDn;
    }
}
```

假设 AD 返回：

```text
john

memberOf:

CN=aGroup,OU=ApplicationGroups,...
CN=cGroup,OU=ApplicationGroups,...
CN=Employee,OU=Groups,...
```

这个 Service 最终返回：

```java
Set.of(
    "aGroup",
    "cGroup",
    "Employee"
)
```

---

# 6. application.yml

```yaml
spring:
  ldap:
    urls:
      - ldaps://ad.company.com:636

    base: dc=company,dc=com

    username: CN=my-api-service-account,OU=ServiceAccounts,DC=company,DC=com

    password: ${AD_PASSWORD}

app:
  security:
    user-header: X-Authenticated-User
```

这里：

```text
username/password
```

是你 Web App 用来**查询 AD 的 service account**。

不是 Web App 用户的 username/password。

用户身份来自：

```http
X-Authenticated-User: john
```

---

# 7. 把 username + groups + permissions 放进 Spring Security

这是核心 Filter。

`HeaderAuthenticationFilter.java`

```java
package com.example.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.security.core.authority
        .SimpleGrantedAuthority;

import org.springframework.security.web.authentication
        .WebAuthenticationDetailsSource;

import org.springframework.security.web.authentication.preauth
        .PreAuthenticatedAuthenticationToken;

import org.springframework.stereotype.Component;

import org.springframework.web.filter
        .OncePerRequestFilter;

import java.io.IOException;

import java.util.List;
import java.util.Set;


@Component
public class HeaderAuthenticationFilter
        extends OncePerRequestFilter {

    private final ActiveDirectoryGroupService
            groupService;

    private final GroupPermissionService
            permissionService;

    private final String userHeader;


    public HeaderAuthenticationFilter(
            ActiveDirectoryGroupService
                    groupService,

            GroupPermissionService
                    permissionService,

            @Value(
                "${app.security.user-header}"
            )
            String userHeader) {

        this.groupService =
                groupService;

        this.permissionService =
                permissionService;

        this.userHeader =
                userHeader;
    }


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)

            throws ServletException,
                   IOException {


        Authentication existingAuthentication =
                SecurityContextHolder
                    .getContext()
                    .getAuthentication();


        /*
         * 如果当前 request 还没有 Authentication，
         * 才从 trusted header 建立。
         */
        if (existingAuthentication == null) {

            String username =
                    request.getHeader(
                            userHeader
                    );


            if (username != null &&
                    !username.isBlank()) {


                username =
                        username.trim();


                /*
                 * 1.
                 *
                 * username
                 *
                 * ↓
                 *
                 * Active Directory groups
                 */
                Set<String> groups =
                        groupService.getGroups(
                                username
                        );


                /*
                 * 2.
                 *
                 * LDAP groups
                 *
                 * ↓
                 *
                 * JSON
                 *
                 * ↓
                 *
                 * ApiAuthority
                 */
                Set<ApiAuthority> permissions =
                        permissionService
                            .getPermissions(
                                    groups
                            );


                /*
                 * 3.
                 *
                 * ApiAuthority
                 *
                 * ↓
                 *
                 * Spring Security
                 * GrantedAuthority
                 */
                List<SimpleGrantedAuthority>
                        authorities =
                        permissions.stream()
                                .map(
                                    authority ->
                                        new SimpleGrantedAuthority(
                                            authority
                                                .getAuthority()
                                        )
                                )
                                .toList();


                /*
                 * OIDC 已经在 upstream 完成。
                 *
                 * 所以这里是：
                 *
                 * PreAuthenticated
                 */
                PreAuthenticatedAuthenticationToken
                        authentication =
                        new PreAuthenticatedAuthenticationToken(
                                username,
                                null,
                                authorities
                        );


                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(
                                        request
                                )
                );


                /*
                 * 创建这个 request 的
                 * SecurityContext。
                 */
                SecurityContext context =
                        SecurityContextHolder
                            .createEmptyContext();


                context.setAuthentication(
                        authentication
                );


                SecurityContextHolder
                        .setContext(
                                context
                        );
            }
        }


        filterChain.doFilter(
                request,
                response
        );
    }
}
```

这里使用：

```java
PreAuthenticatedAuthenticationToken
```

比：

```java
UsernamePasswordAuthenticationToken
```

更符合你的架构。

因为：

```text
Spring Boot 并没有检查密码。

OIDC Gateway 已经检查过身份。

Spring Boot 接收到的是一个
pre-authenticated user。
```

---

# 8. SecurityConfig

`SecurityConfig.java`

```java
package com.example.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.config.annotation
        .method.configuration.EnableMethodSecurity;

import org.springframework.security.config.annotation
        .web.builders.HttpSecurity;

import org.springframework.security.config.annotation
        .web.configurers.AbstractHttpConfigurer;

import org.springframework.security.config.http
        .SessionCreationPolicy;

import org.springframework.security.web
        .SecurityFilterChain;

import org.springframework.security.web.authentication
        .UsernamePasswordAuthenticationFilter;


@Configuration

/*
 * 启用：
 *
 * @PreAuthorize(...)
 */
@EnableMethodSecurity
public class SecurityConfig {


    @Bean
    public SecurityFilterChain
            securityFilterChain(

            HttpSecurity http,

            HeaderAuthenticationFilter
                    headerAuthenticationFilter)

            throws Exception {


        http

            /*
             * 这是 stateless backend API demo。
             *
             * 假设 upstream OIDC Gateway
             * 已经负责浏览器登录安全。
             */
            .csrf(
                AbstractHttpConfigurer::disable
            )


            /*
             * Spring Boot 没有 login page。
             */
            .formLogin(
                AbstractHttpConfigurer::disable
            )


            .httpBasic(
                AbstractHttpConfigurer::disable
            )


            /*
             * 每一个 request 都从 trusted
             * header 重建 identity。
             */
            .sessionManagement(
                session ->
                    session
                        .sessionCreationPolicy(
                            SessionCreationPolicy
                                .STATELESS
                        )
            )


            .authorizeHttpRequests(
                auth -> auth

                    /*
                     * 所有 /api/**
                     * 必须是已经通过公司
                     * OIDC 登录的用户。
                     */
                    .requestMatchers(
                        "/api/**"
                    )
                    .authenticated()


                    /*
                     * 没明确允许的 URL
                     * 默认拒绝。
                     */
                    .anyRequest()
                    .denyAll()
            )


            /*
             * 在 Spring Security 做
             * authorization 之前，
             * 建立 Authentication。
             */
            .addFilterBefore(
                headerAuthenticationFilter,
                UsernamePasswordAuthenticationFilter
                    .class
            )


            /*
             * Header 不存在时：
             *
             * /api/** 返回 401。
             */
            .exceptionHandling(
                exceptions ->
                    exceptions
                        .authenticationEntryPoint(
                            (request,
                             response,
                             exception) ->

                                response.sendError(
                                    HttpServletResponse
                                        .SC_UNAUTHORIZED
                                )
                        )
            );


        return http.build();
    }
}
```

这里少一个 import：

```java
import jakarta.servlet.http.HttpServletResponse;
```

所以完整 imports 里加上它。

---

# 9. Controller + `@PreAuthorize`

`ItemController.java`

```java
package com.example.demo.controller;

import org.springframework.security.access.prepost
        .PreAuthorize;

import org.springframework.security.core
        .Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api")
public class ItemController {


    /*
     * 没有 @PreAuthorize。
     *
     * 所有已经通过公司 OIDC
     * 认证的用户都可以使用。
     */
    @GetMapping("/me")
    public String me(
            Authentication authentication) {

        return "Current user: "
                + authentication.getName();
    }


    /*
     * 需要：
     *
     * API_GET
     */
    @GetMapping("/items")
    @PreAuthorize(
        "hasAuthority(" +
        "T(com.example.demo.security.ApiAuthority)" +
        ".API_GET.getAuthority()" +
        ")"
    )
    public List<String> getItems() {

        return List.of(
                "Laptop",
                "Monitor",
                "Keyboard"
        );
    }


    /*
     * 需要：
     *
     * API_POST
     */
    @PostMapping("/items")
    @PreAuthorize(
        "hasAuthority(" +
        "T(com.example.demo.security.ApiAuthority)" +
        ".API_POST.getAuthority()" +
        ")"
    )
    public String createItem(
            @RequestBody String item) {

        return "Created: " + item;
    }


    /*
     * 需要：
     *
     * API_UPDATE
     */
    @PutMapping("/items/{id}")
    @PreAuthorize(
        "hasAuthority(" +
        "T(com.example.demo.security.ApiAuthority)" +
        ".API_UPDATE.getAuthority()" +
        ")"
    )
    public String updateItem(
            @PathVariable int id,
            @RequestBody String item) {

        return "Updated item "
                + id
                + ": "
                + item;
    }


    /*
     * 需要：
     *
     * API_DELETE
     */
    @DeleteMapping("/items/{id}")
    @PreAuthorize(
        "hasAuthority(" +
        "T(com.example.demo.security.ApiAuthority)" +
        ".API_DELETE.getAuthority()" +
        ")"
    )
    public String deleteItem(
            @PathVariable int id) {

        return "Deleted item "
                + id;
    }
}
```

实际上 annotation 也可以写成一行，会清楚很多：

```java
@PreAuthorize(
    "hasAuthority(T(com.example.demo.security.ApiAuthority).API_GET.getAuthority())"
)
```

所以真实项目里我会这样写：

```java
@GetMapping("/items")
@PreAuthorize(
    "hasAuthority(T(com.example.demo.security.ApiAuthority).API_GET.getAuthority())"
)
public List<String> getItems() {
    ...
}
```

POST：

```java
@PostMapping("/items")
@PreAuthorize(
    "hasAuthority(T(com.example.demo.security.ApiAuthority).API_POST.getAuthority())"
)
public String createItem(...) {
    ...
}
```

DELETE：

```java
@DeleteMapping("/items/{id}")
@PreAuthorize(
    "hasAuthority(T(com.example.demo.security.ApiAuthority).API_DELETE.getAuthority())"
)
public String deleteItem(...) {
    ...
}
```

---

# 10. Main Application

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure
        .SpringBootApplication;


@SpringBootApplication
public class DemoApplication {

    public static void main(
            String[] args) {

        SpringApplication.run(
                DemoApplication.class,
                args
        );
    }
}
```

---

# 实际运行一次看看

假设公司 OIDC Gateway 给 Spring Boot：

```http
X-Authenticated-User: john
```

Spring Boot 去 AD 查：

```text
john groups:

aGroup
cGroup
Employee
Everyone
```

你的 JSON：

```json
{
  "aGroup": ["get", "delete", "update"],

  "bGroup": ["get", "update"],

  "cGroup": ["post"]
}
```

启动时的 `permissionConfig` 已经是：

```text
agroup
    ↓
API_GET
API_DELETE
API_UPDATE

bgroup
    ↓
API_GET
API_UPDATE

cgroup
    ↓
API_POST
```

所以 John：

```text
aGroup
   ↓
API_GET
API_DELETE
API_UPDATE

cGroup
   ↓
API_POST

Employee
   ↓
JSON 没有
   ↓
ignore
```

最终：

```java
authentication.getAuthorities()
```

里面相当于：

```text
API_GET
API_DELETE
API_UPDATE
API_POST
```

于是：

```java
@PreAuthorize(
    "hasAuthority(...API_GET...)"
)
```

✅

```java
@PreAuthorize(
    "hasAuthority(...API_POST...)"
)
```

✅

```java
@PreAuthorize(
    "hasAuthority(...API_DELETE...)"
)
```

✅

---

假设 Mary 属于：

```text
bGroup
Employee
```

最终：

```text
API_GET
API_UPDATE
```

那么：

```text
GET     ✅
PUT     ✅
POST    ❌ 403
DELETE  ❌ 403
```

而：

```java
@GetMapping("/api/me")
```

没有 `@PreAuthorize`：

```text
只要 OIDC authenticated
→ ✅
```

---

## 最后有几个生产环境里非常重要的点

- **`X-Authenticated-User` 必须是 trusted header。** 外部用户不能绕过 OIDC Gateway 直接访问 Spring Boot，也不能自己伪造这个 header。Gateway 应该删除客户端提供的同名 header，然后重新写入认证后的 username。
- 当前 `memberOf` 示例取得的是 AD 的**直接 group membership**。如果你公司的权限组存在 nested groups，例如 `john → TeamA → aGroup`，需要根据你们 AD 架构额外处理 nested membership。
- 当前 JSON 是**应用启动时读取一次**。修改 JSON 后默认需要重启应用。如果你希望不重启就刷新配置，可以再做 reload。
- `/api/**` 下没有 `@PreAuthorize` 的 method = **所有 OIDC 已认证用户都能调用**；有 annotation 的 method = 在 authenticated 基础上再检查 `API_GET / API_POST / ...`。

整体上，你现在这套设计已经把职责分得比较清楚了：

```text
OIDC
= 你是谁

Active Directory
= 你属于哪些组

JSON
= 每个组有什么权限

ApiAuthority enum
= Java 中合法的权限集合

SimpleGrantedAuthority
= 把这些权限告诉 Spring Security

@PreAuthorize
= 每个 Controller method 需要什么权限
```

这正适合你现在这种“**很多公司 LDAP group，但是 Controller 只关心 GET / POST / UPDATE / DELETE 权限**”的架构。
