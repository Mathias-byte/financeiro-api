
-- -----------------------------------------------------
-- Table `20262M_prj5_condominio_financeiro`.`cobranca`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `20262M_prj5_condominio_financeiro`.`cobranca` (
  `cobranca_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `imovel_id` INT UNSIGNED NOT NULL,
  `cobranca_descricao` VARCHAR(255) NULL DEFAULT NULL,
  `cobranca_competencia` DATE NOT NULL,
  `cobranca_valor` DECIMAL(10,2) NOT NULL,
  `cobranca_vencimento` DATE NOT NULL,
  `cobranca_tipo` ENUM('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO') NOT NULL DEFAULT 'PENDENTE',
  `cobranca_data_criacao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `cobranca_status` INT NULL,
  PRIMARY KEY (`cobranca_id`),
  UNIQUE INDEX `uk_cobranca_imovel_competencia` (`imovel_id` , `cobranca_competencia` ) ,
  INDEX `idx_cobranca_imovel` (`imovel_id` ) ,
  INDEX `idx_cobranca_tipo` (`cobranca_tipo` ) ,
  INDEX `idx_cobranca_vencimento` (`cobranca_vencimento` ) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `20262M_prj5_condominio_financeiro`.`boleto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `20262M_prj5_condominio_financeiro`.`boleto` (
  `boleto_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cobranca_id` INT UNSIGNED NOT NULL,
  `boleto_codigo_barras` VARCHAR(255) NULL DEFAULT NULL,
  `boleto_linha_digitavel` VARCHAR(255) NULL DEFAULT NULL,
  `boleto_url_pdf` VARCHAR(500) NULL DEFAULT NULL,
  `boleto_data_emissao` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `boleto_status` INT NULL,
  PRIMARY KEY (`boleto_id`),
  UNIQUE INDEX `uk_cobranca` (`cobranca_id` ) ,
  UNIQUE INDEX `uk_boleto_linha_digitavel` (`boleto_linha_digitavel` ) ,
  INDEX `idx_boleto_codigo_barras` (`boleto_codigo_barras` ) ,
  CONSTRAINT `fk_cobranca`
    FOREIGN KEY (`cobranca_id`)
    REFERENCES `20262M_prj5_condominio_financeiro`.`cobranca` (`cobranca_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `20262M_prj5_condominio_financeiro`.`despesa`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `20262M_prj5_condominio_financeiro`.`despesa` (
  `despesa_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `despesa_descricao` VARCHAR(255) NULL DEFAULT NULL,
  `despesa_fornecedor` VARCHAR(150) NULL DEFAULT NULL,
  `despesa_valor` DECIMAL(10,2) NOT NULL,
  `despesa_data_despesa` DATE NOT NULL,
  `despesa_categoria` VARCHAR(100) NULL DEFAULT NULL,
  `despesa_status` INT NULL,
  PRIMARY KEY (`despesa_id`),
  INDEX `idx_despesa_data` (`despesa_data_despesa` ) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `20262M_prj5_condominio_financeiro`.`pagamento`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `20262M_prj5_condominio_financeiro`.`pagamento` (
  `pagamento_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cobrancas_id` INT UNSIGNED NOT NULL,
  `pagamento_valor_pago` DECIMAL(10,2) NOT NULL,
  `pagamento_data_pagamento` TIMESTAMP NOT NULL,
  `pagamento_forma_pagamento` ENUM('PIX', 'BOLETO', 'CARTAO', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRO') NOT NULL,
  `pagamento_observacao` TEXT NULL DEFAULT NULL,
  `pagamento_status` INT NULL,
  PRIMARY KEY (`pagamento_id`),
  INDEX `idx_cobranca` (`cobrancas_id` ) ,
  INDEX `idx_pagamento_data` (`pagamento_data_pagamento` ) ,
  CONSTRAINT `fk_cobrancas`
    FOREIGN KEY (`cobrancas_id`)
    REFERENCES `20262M_prj5_condominio_financeiro`.`cobranca` (`cobranca_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;


-- -----------------------------------------------------
-- Table `20262M_prj5_condominio_financeiro`.`receita`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `20262M_prj5_condominio_financeiro`.`receita` (
  `receita_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `receita_descricao` VARCHAR(255) NULL DEFAULT NULL,
  `receita_valor` DECIMAL(10,2) NOT NULL,
  `receita_data_receita` DATE NOT NULL,
  `receita_categoria` VARCHAR(100) NULL DEFAULT NULL,
  `receita_status` INT NULL,
  PRIMARY KEY (`receita_id`),
  INDEX `idx_receita_data` (`receita_data_receita` ) )
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_unicode_ci;

