import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 自定义渲染函数，包含常用的 Provider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </ConfigProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// 重新导出所有 testing-library 的方法
export * from '@testing-library/react';
export { customRender as render };
