package com.hospital.arnavigation;

import java.io.OutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

/**
 * 演示应用程序 - 直接运行A*算法Demo
 * 该类提供了一个用户友好的命令行界面
 */
public class DemoApplication {

    public static void main(String[] args) {
        try {
            // 设置控制台输出编码为UTF-8，防止乱码
            System.setOut(new PrintStream(new OutputStream() {
                final PrintStream out = System.out;
                @Override
                public void write(int b) {
                    out.write(b);
                }
            }, true, StandardCharsets.UTF_8.name()));

            System.out.println("========================================");
            System.out.println("   医院AR导航系统 - Demo应用程序启动");
            System.out.println("========================================\n");

            // 直接运行A*算法Demo
            AStarPathFindingDemo.main(args);

        } catch (Exception e) {
            System.err.println("Demo启动失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
