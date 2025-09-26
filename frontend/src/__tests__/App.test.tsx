import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App component", () => {
  it("renders app container", () => {
    render(<App />);
    expect(screen.getByText(/CryptoPulse/i)).toBeInTheDocument();
  });
});
