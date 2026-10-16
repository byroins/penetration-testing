package com.jsnjfz.manage.core.shiro;

import java.io.Serializable;
import java.util.List;

/**
 * 身份类「存根」示例（WebStack-Guns / jsnjfz 分支）。
 *
 * 作用：只为让序列化流里出现正确的类描述符，不代表目标代码，也不参与任何业务逻辑。
 * 要点：包名、类名、字段名、字段类型、serialVersionUID 必须与目标一致。
 *
 * 换成你自己的目标时：把本文件复制到对应包路径下，按目标的身份类改字段即可。
 * 字段不确定时，可先用「泄漏的报错 / 反编译目标 jar」确认，再回来改这里。
 */
public class ShiroUser implements Serializable {
    private static final long serialVersionUID = 1L;
    public Integer id;        // 主键
    public String account;    // 账号
    public String name;       // 姓名
    public Integer deptId;    // 部门 id
    public List roleList;     // 角色集
    public String deptName;   // 部门名称
    public List roleNames;    // 角色名称集

    public ShiroUser() {
    }
}