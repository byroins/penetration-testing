package com.nikati.manage.core.shiro;

import java.io.Serializable;
import java.util.List;

/**
 * 身份类「存根」示例（WebStack-Guns / nikati 分支）。字段与 jsnjfz 分支相同。
 * 说明见 java/stubs/com/jsnjfz/manage/core/shiro/ShiroUser.java
 */
public class ShiroUser implements Serializable {
    private static final long serialVersionUID = 1L;
    public Integer id;
    public String account;
    public String name;
    public Integer deptId;
    public List roleList;
    public String deptName;
    public List roleNames;

    public ShiroUser() {
    }
}